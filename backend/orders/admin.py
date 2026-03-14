from django.contrib import admin

from orders.models import DownloadAccess, Order, OrderItem, PurchaseLicense

admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(PurchaseLicense)
admin.site.register(DownloadAccess)
