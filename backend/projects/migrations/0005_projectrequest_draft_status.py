from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0004_make_projectrequest_producer_optional"),
    ]

    operations = [
        migrations.AlterField(
            model_name="projectrequest",
            name="status",
            field=models.CharField(
                choices=[("draft", "Draft"), ("pending", "Pending"), ("accepted", "Accepted"), ("rejected", "Rejected")],
                default="pending",
                max_length=20,
            ),
        ),
    ]
