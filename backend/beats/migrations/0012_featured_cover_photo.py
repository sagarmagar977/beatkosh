from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("beats", "0011_beat_instrument_types_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="FeaturedCoverPhoto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=120)),
                ("image", models.FileField(upload_to="beats/featured-covers/")),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ("title", "-created_at")},
        ),
        migrations.AddField(
            model_name="beat",
            name="featured_cover_photo",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="beats", to="beats.featuredcoverphoto"),
        ),
        migrations.AddField(
            model_name="beatuploaddraft",
            name="featured_cover_photo",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="drafts", to="beats.featuredcoverphoto"),
        ),
    ]
