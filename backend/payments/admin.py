from django.contrib import admin

from payments.models import Payment, ProducerWallet, Transaction, WalletLedgerEntry

admin.site.register(Payment)
admin.site.register(Transaction)
admin.site.register(ProducerWallet)
admin.site.register(WalletLedgerEntry)
