from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_usernotification"),
    ]

    operations = [
        migrations.AddField(
            model_name="producerprofile",
            name="avatar_obj",
            field=models.FileField(blank=True, null=True, upload_to="profiles/producers/"),
        ),
    ]
