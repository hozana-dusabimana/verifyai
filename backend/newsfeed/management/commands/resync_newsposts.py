from django.core.management.base import BaseCommand

from newsfeed.models import NewsPost


class Command(BaseCommand):
    help = (
        'Re-derive every news post status from its stored analysis result, '
        'applying the current approval policy (e.g. the headline-body '
        'consistency gate). Idempotent — safe to run on every deploy.'
    )

    def handle(self, *args, **options):
        changed = 0
        posts = NewsPost.objects.exclude(analysis_result=None).select_related('analysis_result')
        for post in posts:
            old_status = post.status
            post.sync_from_result()
            if post.status != old_status:
                changed += 1
                self.stdout.write(
                    f'{post.id} "{post.title[:60]}": {old_status} -> {post.status}'
                )
        self.stdout.write(self.style.SUCCESS(
            f'Resynced {posts.count()} posts, {changed} status change(s).'
        ))
