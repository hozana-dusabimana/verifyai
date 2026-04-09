"""
ML model training Celery task.
"""

from celery import shared_task


@shared_task(bind=True, max_retries=0)
def run_model_training(self, dataset_path=None):
    """Run full model training pipeline as a background task."""
    from ml_engine.train import train_all
    from ml_engine.inference import clear_model_cache

    try:
        metrics = train_all(dataset_path)
        clear_model_cache()
        return {
            'status': 'completed',
            'metrics': metrics,
        }
    except Exception as exc:
        return {
            'status': 'failed',
            'error': str(exc),
        }
