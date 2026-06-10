from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsfeed', '0002_portal_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='newspost',
            name='source_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='newspost',
            name='source_match_score',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='newspost',
            name='named_entity_count',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
