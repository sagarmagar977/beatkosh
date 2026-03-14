from rest_framework.permissions import BasePermission, SAFE_METHODS


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
