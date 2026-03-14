from django.db import migrations


def seed_default_plans(apps, schema_editor):
    ProducerPlan = apps.get_model("payments", "ProducerPlan")
    defaults = [
        {
            "code": "starter-monthly",
            "name": "Starter",
            "price": "0.00",
            "billing_cycle": "monthly",
            "features": ["basic upload", "marketplace listing"],
            "is_active": True,
        },
        {
            "code": "pro-monthly",
            "name": "Pro",
            "price": "29.00",
            "billing_cycle": "monthly",
            "features": ["priority listing", "advanced analytics", "creator tools"],
            "is_active": True,
        },
    ]
    for payload in defaults:
        ProducerPlan.objects.update_or_create(code=payload["code"], defaults=payload)


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0002_producerplan_producerpayoutprofile_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_default_plans, noop_reverse),
    ]
