from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("beats", "0014_beat_mood_types_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="beat",
            name="featured_producer_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="beatuploaddraft",
            name="featured_producer_ids",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
