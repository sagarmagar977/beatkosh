from pathlib import Path

from django import forms
from django.contrib import admin, messages
from django.shortcuts import redirect, render
from django.urls import path, reverse

from beats.models import Beat, BeatTag, FeaturedCoverPhoto, LicenseType


class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class BulkFeaturedCoverUploadForm(forms.Form):
    files = forms.FileField(
        widget=MultipleFileInput(),
        required=False,
        help_text="Select multiple cover images to upload at once.",
    )
    is_active = forms.BooleanField(required=False, initial=True)


@admin.register(FeaturedCoverPhoto)
class FeaturedCoverPhotoAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("title", "checksum")
    change_list_template = "admin/beats/featuredcoverphoto/change_list.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("bulk-upload/", self.admin_site.admin_view(self.bulk_upload_view), name="beats_featuredcoverphoto_bulk_upload"),
        ]
        return custom_urls + urls

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["bulk_upload_url"] = reverse("admin:beats_featuredcoverphoto_bulk_upload")
        return super().changelist_view(request, extra_context=extra_context)

    def bulk_upload_view(self, request):
        form = BulkFeaturedCoverUploadForm(request.POST or None, request.FILES or None)
        if request.method == "POST":
            uploads = request.FILES.getlist("files")
            if not uploads:
                form.add_error("files", "Select at least one image to upload.")
            else:
                created_count = 0
                skipped_count = 0
                is_active = request.POST.get("is_active") in {"on", "true", "1"}
                for upload in uploads:
                    title = Path(upload.name).stem[:120] or "Cover Photo"
                    cover = FeaturedCoverPhoto(title=title, image=upload, is_active=is_active)
                    checksum = cover._build_checksum()
                    if FeaturedCoverPhoto.objects.filter(checksum=checksum).exists():
                        skipped_count += 1
                        continue
                    cover.checksum = checksum
                    cover.save()
                    created_count += 1
                if created_count:
                    self.message_user(request, f"Uploaded {created_count} new cover photo(s).", level=messages.SUCCESS)
                if skipped_count:
                    self.message_user(request, f"Skipped {skipped_count} duplicate cover photo(s).", level=messages.WARNING)
                return redirect("admin:beats_featuredcoverphoto_changelist")

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": "Bulk upload featured cover photos",
            "form": form,
        }
        return render(request, "admin/beats/featuredcoverphoto/bulk_upload.html", context)


admin.site.register(Beat)
admin.site.register(BeatTag)
admin.site.register(LicenseType)
