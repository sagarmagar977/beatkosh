from django.urls import path

from messaging.views import ConversationListView, MessageCreateView

def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]

urlpatterns = [
    *both("conversations", ConversationListView.as_view(), "conversation-list"),
    *both("messages", MessageCreateView.as_view(), "message-create"),
]
