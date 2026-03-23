from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('analytics_app', '0003_activitydrop'),
        ('beats', '0015_beat_featured_producer_ids_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserTasteProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('favorite_genres', models.JSONField(blank=True, default=list)),
                ('favorite_moods', models.JSONField(blank=True, default=list)),
                ('favorite_instruments', models.JSONField(blank=True, default=list)),
                ('favorite_producer_ids', models.JSONField(blank=True, default=list)),
                ('liked_genres', models.JSONField(blank=True, default=list)),
                ('bpm_min', models.PositiveIntegerField(default=0)),
                ('bpm_max', models.PositiveIntegerField(default=0)),
                ('bpm_average', models.PositiveIntegerField(default=0)),
                ('today_snapshot', models.JSONField(blank=True, default=dict)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='taste_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-updated_at',),
            },
        ),
        migrations.CreateModel(
            name='ListeningSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source', models.CharField(blank=True, max_length=80)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('last_event_at', models.DateTimeField(auto_now=True)),
                ('listened_seconds', models.PositiveIntegerField(default=0)),
                ('duration_seconds', models.PositiveIntegerField(default=0)),
                ('completion_percent', models.PositiveIntegerField(default=0)),
                ('is_completed', models.BooleanField(default=False)),
                ('is_skipped', models.BooleanField(default=False)),
                ('end_reason', models.CharField(choices=[('switch', 'Switch'), ('pause', 'Pause'), ('ended', 'Ended'), ('close', 'Close'), ('unknown', 'Unknown')], default='unknown', max_length=20)),
                ('beat', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='listening_sessions', to='beats.beat')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='listening_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-started_at', '-id'),
            },
        ),
    ]
