from django.db import migrations, models

import beats.metadata_choices


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0002_deliverable_status_deliverable_version_label_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="instrument_types",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="project",
            name="mood_types",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="project",
            name="offer_price",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="project",
            name="preferred_genre",
            field=models.CharField(blank=True, choices=beats.metadata_choices.GENRE_CHOICES, max_length=120),
        ),
        migrations.AddField(
            model_name="projectrequest",
            name="instrument_types",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="projectrequest",
            name="mood_types",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="projectrequest",
            name="offer_price",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="projectrequest",
            name="preferred_genre",
            field=models.CharField(blank=True, choices=beats.metadata_choices.GENRE_CHOICES, max_length=120),
        ),
    ]
