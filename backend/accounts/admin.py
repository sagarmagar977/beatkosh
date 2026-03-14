from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import ArtistProfile, ProducerProfile, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "BeatKosh Roles",
            {"fields": ("is_artist", "is_producer", "active_role")},
        ),
    )
    list_display = ("id", "username", "email", "is_artist", "is_producer", "active_role", "is_staff")


@admin.register(ArtistProfile)
class ArtistProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "stage_name", "verified", "created_at")
    search_fields = ("user__username", "stage_name")


@admin.register(ProducerProfile)
class ProducerProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "producer_name", "verified", "rating", "total_sales", "created_at")
    search_fields = ("user__username", "producer_name")
