from django.contrib import admin

from beats.models import Beat, BeatTag, LicenseType

admin.site.register(Beat)
admin.site.register(BeatTag)
admin.site.register(LicenseType)
