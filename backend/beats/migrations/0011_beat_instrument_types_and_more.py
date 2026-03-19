from django.db import migrations, models


def seed_instrument_types(apps, schema_editor):
    Beat = apps.get_model("beats", "Beat")
    BeatUploadDraft = apps.get_model("beats", "BeatUploadDraft")

    for model in (Beat, BeatUploadDraft):
        for item in model.objects.all().iterator():
            instruments = item.instrument_types if isinstance(item.instrument_types, list) else []
            if not instruments and item.instrument_type:
                item.instrument_types = [item.instrument_type]
                item.save(update_fields=["instrument_types"])


class Migration(migrations.Migration):
    dependencies = [
        ("beats", "0010_beat_abuse_reports_count_beat_fingerprint_status_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="beat",
            name="instrument_types",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="beatuploaddraft",
            name="instrument_types",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(seed_instrument_types, migrations.RunPython.noop),
    ]
