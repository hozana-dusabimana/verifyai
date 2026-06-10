import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('newsfeed', '0003_source_corroboration_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='newspost',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('review', 'Pending Review'),
                    ('failed', 'Failed'),
                ],
                default='pending', max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='newspost',
            name='reviewed_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='reviewed_news_posts',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='newspost',
            name='reviewed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
