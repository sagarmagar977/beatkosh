from django.contrib import admin

from catalog.models import BeatTape, BeatTapeTrack, Bundle, BundleItem

admin.site.register(Bundle)
admin.site.register(BundleItem)
admin.site.register(BeatTape)
admin.site.register(BeatTapeTrack)
