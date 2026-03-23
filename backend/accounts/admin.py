from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import ArtistProfile, LibraryListenLater, LibraryPlaylist, LibraryPlaylistItem, ProducerProfile, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "BeatKosh Roles",
            {"fields": ("is_artist", "is_producer", "active_role", "auth_provider", "google_sub")},
        ),
    )
    list_display = ("id", "username", "email", "auth_provider", "is_artist", "is_producer", "active_role", "is_staff")


@admin.register(ArtistProfile)
class ArtistProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "stage_name", "verified", "created_at")
    search_fields = ("user__username", "stage_name")


@admin.register(ProducerProfile)
class ProducerProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "producer_name", "verified", "rating", "total_sales", "created_at")
    search_fields = ("user__username", "producer_name")


@admin.register(LibraryPlaylist)
class LibraryPlaylistAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "name", "updated_at", "created_at")
    search_fields = ("owner__username", "name")


@admin.register(LibraryPlaylistItem)
class LibraryPlaylistItemAdmin(admin.ModelAdmin):
    list_display = ("id", "playlist", "beat", "created_at")
    search_fields = ("playlist__name", "playlist__owner__username", "beat__title")


@admin.register(LibraryListenLater)
class LibraryListenLaterAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "beat", "created_at")
    search_fields = ("user__username", "beat__title")
