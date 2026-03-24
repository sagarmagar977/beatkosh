from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0007_libraryplaylist_librarylistenlater_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="artistprofile",
            name="avatar_obj",
            field=models.FileField(blank=True, null=True, upload_to="profiles/artists/"),
        ),
    ]
