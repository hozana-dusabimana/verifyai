"""
Background model-training runner.

Celery runs in eager (synchronous) mode in this deployment, so a real async
queue is not available. Instead we run training in a daemon thread and track
progress on a TrainingJob row that the admin dashboard polls.
"""

import threading

from django.db import connection
from django.utils import timezone

from .models import TrainingJob


def _run(job_id, dataset_path):
    """Thread target: execute the training pipeline and update the job."""
    from ml_engine.train import train_all
    from ml_engine.inference import clear_model_cache

    def progress_cb(percent, stage, message=''):
        TrainingJob.objects.filter(id=job_id).update(
            progress=percent, stage=stage, message=message,
        )

    try:
        TrainingJob.objects.filter(id=job_id).update(
            status=TrainingJob.Status.RUNNING,
            started_at=timezone.now(),
            progress=1,
            stage='Starting',
            message='Initializing training run',
        )

        metrics = train_all(dataset_path, progress_cb=progress_cb)
        clear_model_cache()

        TrainingJob.objects.filter(id=job_id).update(
            status=TrainingJob.Status.COMPLETED,
            progress=100,
            stage='Completed',
            message='All models trained successfully.',
            metrics=metrics,
            finished_at=timezone.now(),
        )
    except Exception as exc:  # noqa: BLE001 — surface any training error to the job
        TrainingJob.objects.filter(id=job_id).update(
            status=TrainingJob.Status.FAILED,
            stage='Failed',
            message='Training failed.',
            error=str(exc),
            finished_at=timezone.now(),
        )
    finally:
        # Release the per-thread DB connection.
        connection.close()


def has_active_job():
    """True if a job is currently pending or running."""
    return TrainingJob.objects.filter(
        status__in=[TrainingJob.Status.PENDING, TrainingJob.Status.RUNNING],
    ).exists()


def start_training_job(user, dataset=None):
    """Create a TrainingJob and launch it in a background daemon thread.

    Returns the created TrainingJob.
    """
    dataset_path = dataset.file.path if dataset else None

    job = TrainingJob.objects.create(
        status=TrainingJob.Status.PENDING,
        stage='Queued',
        message='Training job queued.',
        dataset=dataset,
        started_by=user,
    )

    thread = threading.Thread(target=_run, args=(str(job.id), dataset_path), daemon=True)
    thread.start()

    return job
