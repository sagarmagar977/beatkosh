from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ArtistProfile, BeatLike, ProducerFollow, ProducerProfile
from beats.models import Beat
from accounts.serializers import (
    ArtistProfileSerializer,
    BeatLikeSerializer,
    ProducerFollowSerializer,
    ProducerProfileSerializer,
    RegisterSerializer,
    SwitchRoleSerializer,
    UserMeSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        output = UserMeSerializer(user)
        return Response(output.data, status=status.HTTP_201_CREATED)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserMeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        if user.is_artist:
            ArtistProfile.objects.get_or_create(user=user)
        if user.is_producer:
            ProducerProfile.objects.get_or_create(user=user)
        return user


class SwitchRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SwitchRoleSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.active_role = serializer.validated_data["role"]
        request.user.save(update_fields=["active_role"])
        return Response({"active_role": request.user.active_role}, status=status.HTTP_200_OK)


class StartSellingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        update_fields = []
        if not user.is_producer:
            user.is_producer = True
            update_fields.append("is_producer")
        if user.active_role != User.ROLE_PRODUCER:
            user.active_role = User.ROLE_PRODUCER
            update_fields.append("active_role")
        if update_fields:
            user.save(update_fields=update_fields)
        ProducerProfile.objects.get_or_create(user=user)
        return Response(UserMeSerializer(user).data, status=status.HTTP_200_OK)


class ProducerDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = ProducerProfile.objects.select_related("user")
    serializer_class = ProducerProfileSerializer


class ProducerDetailByUserView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProducerProfileSerializer

    def get_object(self):
        profile, _ = ProducerProfile.objects.get_or_create(user_id=self.kwargs["user_id"])
        return profile


class ArtistProfileMeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ArtistProfileSerializer

    def get_object(self):
        profile, _ = ArtistProfile.objects.get_or_create(user=self.request.user)
        return profile


class ProducerProfileMeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProducerProfileSerializer

    def get_object(self):
        profile, _ = ProducerProfile.objects.get_or_create(user=self.request.user)
        return profile


class FollowProducerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, producer_id: int):
        producer = User.objects.get(id=producer_id)
        if not producer.is_producer:
            raise PermissionDenied("Target user is not a producer.")
        if request.user.id == producer.id:
            raise PermissionDenied("You cannot follow yourself.")
        follow, _ = ProducerFollow.objects.get_or_create(artist=request.user, producer=producer)
        return Response(ProducerFollowSerializer(follow).data, status=status.HTTP_201_CREATED)

    def delete(self, request, producer_id: int):
        ProducerFollow.objects.filter(artist=request.user, producer_id=producer_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyFollowingListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProducerFollowSerializer

    def get_queryset(self):
        return ProducerFollow.objects.filter(artist=self.request.user).select_related("artist", "producer")


class BeatLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, beat_id: int):
        beat = Beat.objects.get(id=beat_id)
        like, _ = BeatLike.objects.get_or_create(user=request.user, beat=beat)
        return Response(BeatLikeSerializer(like).data, status=status.HTTP_201_CREATED)

    def delete(self, request, beat_id: int):
        BeatLike.objects.filter(user=request.user, beat_id=beat_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyBeatLikesListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BeatLikeSerializer

    def get_queryset(self):
        return BeatLike.objects.filter(user=self.request.user).select_related("beat", "beat__producer")
