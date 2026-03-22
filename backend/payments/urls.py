from django.urls import path

from payments.views import (
    PaymentConfirmView,
    PaymentEsewaCompleteView,
    PaymentInitiateView,
    PaymentSimulateSuccessView,
    PaymentWebhookView,
    ProducerPayoutProfileMeView,
    ProducerPlanListView,
    ProducerSubscriptionMeView,
    ProducerWalletMeView,
)


def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]


urlpatterns = [
    *both("initiate", PaymentInitiateView.as_view(), "payment-initiate"),
    *both("confirm", PaymentConfirmView.as_view(), "payment-confirm"),
    *both("esewa/complete", PaymentEsewaCompleteView.as_view(), "payment-esewa-complete"),
    *both("webhook/<str:gateway>", PaymentWebhookView.as_view(), "payment-webhook"),
    *both("simulate-success", PaymentSimulateSuccessView.as_view(), "payment-simulate-success"),
    *both("wallet/me", ProducerWalletMeView.as_view(), "wallet-me"),
    *both("plans", ProducerPlanListView.as_view(), "producer-plan-list"),
    *both("subscription/me", ProducerSubscriptionMeView.as_view(), "producer-subscription-me"),
    *both("payout-profile/me", ProducerPayoutProfileMeView.as_view(), "producer-payout-profile-me"),
]
