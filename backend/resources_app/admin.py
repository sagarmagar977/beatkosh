from django.contrib import admin

from resources_app.models import FAQItem, ResourceArticle

admin.site.register(ResourceArticle)
admin.site.register(FAQItem)
