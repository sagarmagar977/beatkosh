from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0003_project_hiring_metadata"),
    ]

    operations = [
        migrations.AlterField(
            model_name="projectrequest",
            name="producer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.CASCADE,
                related_name="project_requests_received",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
