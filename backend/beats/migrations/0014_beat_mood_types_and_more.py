from django.db import migrations, models


def seed_mood_types(apps, schema_editor):
    Beat = apps.get_model("beats", "Beat")
    BeatUploadDraft = apps.get_model("beats", "BeatUploadDraft")

    for model in (Beat, BeatUploadDraft):
        for item in model.objects.all():
            moods = item.mood_types if isinstance(item.mood_types, list) else []
            if not moods and item.mood:
                item.mood_types = [item.mood]
                item.save(update_fields=["mood_types"])


class Migration(migrations.Migration):

    dependencies = [
        ("beats", "0013_featuredcoverphoto_checksum"),
    ]

    operations = [
        migrations.AddField(
            model_name="beat",
            name="mood_types",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="beatuploaddraft",
            name="mood_types",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(seed_mood_types, migrations.RunPython.noop),
    ]
