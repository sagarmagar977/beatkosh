from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, SAFE_METHODS


def ensure_producer_capability(user, *, message="Producer role required."):
    if not (user and user.is_authenticated and getattr(user, "is_producer", False)):
        raise PermissionDenied(message)


def ensure_producer_mode(user, *, message="Switch to producer mode to access this feature."):
    ensure_producer_capability(user, message=message)
    if getattr(user, "active_role", None) != "producer":
        raise PermissionDenied(message)




class IsProducerOrReadOnly(BasePermission):
    message = "Producer role is required for write actions."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_producer
            and getattr(user, "active_role", None) == "producer"
        )


class IsAdminUser(BasePermission):
    message = "Admin access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)
