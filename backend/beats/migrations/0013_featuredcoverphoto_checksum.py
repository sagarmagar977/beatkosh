from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("beats", "0012_featured_cover_photo"),
    ]

    operations = [
        migrations.AddField(
            model_name="featuredcoverphoto",
            name="checksum",
            field=models.CharField(blank=True, editable=False, max_length=64, null=True, unique=True),
        ),
    ]
