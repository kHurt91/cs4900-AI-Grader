import logging

from django.shortcuts import render
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

# Create your views here.
# apps/users/views.py
from rest_framework import viewsets, status, serializers as drf_serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.conf import settings as django_settings
from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema, inline_serializer
from .models import CustomUser
from .serializers import UserSerializer, UserRegistrationSerializer


logger = logging.getLogger(__name__)


class AuthViewSet(viewsets.ViewSet):
    """
    ViewSet for authentication operations
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=UserRegistrationSerializer,
        responses={201: inline_serializer("RegisterResponse", fields={
            "user": UserSerializer(),
            "tokens": inline_serializer("RegisterTokens", fields={
                "access": drf_serializers.CharField(),
                "refresh": drf_serializers.CharField(),
            }),
        })},
    )
    @action(detail=False, methods=["post"])
    def register(self, request):
        """
        Register a new user

        POST /api/auth/register/
        {
            "username": "student1",
            "email": "student1@example.com",
            "password": "password123",
            "first_name": "John",
            "last_name": "Doe"
        }
        """
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "user": UserSerializer(user).data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"],
            permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Logout user — blacklists refresh token cookie and clears it.

        POST /api/users/auth/logout/
        No body needed — reads refresh_token cookie automatically.
        """
        try:
            token_str = request.COOKIES.get("refresh_token")
            if token_str:
                RefreshToken(token_str).blacklist()
        except Exception as e:
            logger.warning(f"Logout blacklist error: {e}")

        response = Response({"message": "Logout successful"}, status=status.HTTP_200_OK)
        response.delete_cookie(key="refresh_token", path="/", samesite="Strict")
        return response

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def refresh(self, request):
        """
        Refresh access token using httpOnly cookie.

        POST /api/users/auth/refresh/
        No body needed — reads refresh_token cookie automatically.
        Returns: { access, user }
        """
        refresh_token_str = request.COOKIES.get("refresh_token")

        if not refresh_token_str:
            return Response(
                {"error": "No refresh token cookie present"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(refresh_token_str)
            user = CustomUser.objects.get(id=refresh["user_id"])
        except (TokenError, InvalidToken, CustomUser.DoesNotExist):
            return Response(
                {"error": "Invalid or expired refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response({
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        })

    @action(detail=False, methods=["get"],
            permission_classes=[IsAuthenticated])
    def profile(self, request):
        """
        Get current user profile

        GET /api/auth/profile/
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        request=inline_serializer("ForgotPasswordRequest", fields={
            "email": drf_serializers.EmailField(),
        }),
        responses={200: inline_serializer("ForgotPasswordResponse", fields={
            "message": drf_serializers.CharField(),
            "reset_token": drf_serializers.CharField(required=False),
            "user_id": drf_serializers.IntegerField(required=False),
        })},
    )
    @action(detail=False, methods=['post'])
    def forgot_password(self, request):
        """
        Request password reset
        
        POST /api/users/auth/forgot-password/
        {
            "email": "user@example.com"
        }
        """
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = CustomUser.objects.get(email=email)
            # In production, send email with reset token
            # For now, return a reset token
            refresh = RefreshToken.for_user(user)
            reset_token = str(refresh.access_token)
            
            return Response({
                'message': 'Password reset instructions sent to email',
                'reset_token': reset_token,  # Remove in production!
                'user_id': user.id
            })
        except CustomUser.DoesNotExist:
            # Don't reveal if email exists for security
            return Response({
                'message': 'If email exists, reset instructions have been sent'
            })
    
    @extend_schema(
        request=inline_serializer("ResetPasswordRequest", fields={
            "user_id": drf_serializers.IntegerField(),
            "new_password": drf_serializers.CharField(),
        }),
        responses={200: inline_serializer("ResetPasswordResponse", fields={
            "message": drf_serializers.CharField(),
        })},
    )
    @action(detail=False, methods=['post'])
    def reset_password(self, request):
        """
        Reset password with token
        
        POST /api/users/auth/reset-password/
        {
            "user_id": 1,
            "new_password": "newpassword123"
        }
        """
        user_id = request.data.get('user_id')
        new_password = request.data.get('new_password')
        
        if not user_id or not new_password:
            return Response(
                {'error': 'user_id and new_password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = CustomUser.objects.get(id=user_id)
            user.set_password(new_password)
            user.save()
            
            return Response({
                'message': 'Password reset successful. You can now login with your new password.'
            })
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Invalid user'},
                status=status.HTTP_404_NOT_FOUND
            )

    @extend_schema(
        request=inline_serializer("LoginRequest", fields={
            "username": drf_serializers.CharField(),
            "password": drf_serializers.CharField(),
            "role": drf_serializers.ChoiceField(choices=["student", "instructor"]),
        }),
        responses={200: inline_serializer("LoginResponse", fields={
            "user": UserSerializer(),
            "tokens": inline_serializer("LoginTokens", fields={
                "access": drf_serializers.CharField(),
            }),
        })},
    )
    @action(detail=False, methods=["post"])
    def login(self, request):
        """
        Login user

        POST /api/auth/login/
        {
            "username": "student1",
            "password": "password123"
        }
        """
        username = request.data.get("username")
        password = request.data.get("password")
        role = request.data.get("role")

        try: # check if we were sent an email instead of a username
            validate_email(username)
            q_result = CustomUser.objects.filter(email=username)

            # if there are multiple db entries with the same email
            if len(q_result) > 1:
                logger.error(f"Multiple DB entries for email {username}\n")
            if len(q_result) > 0:
                username = q_result[0].get_username()
        except ValidationError:
            pass

        if not username or not password:
            return Response(
                {"error": "Please provide both username and password"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {
                    "error": "Invalid credentials",
                    "username": username,
                    "password": password,
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        elif user.role != role:
            return Response(
                {
                    "error": "Invalid role.",
                    "requested_role": role,
                    "user_role": user.role
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)

        response = Response({
            "user": UserSerializer(user).data,
            "tokens": {
                "access": str(refresh.access_token),
            },
        })
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            secure=not django_settings.DEBUG,
            samesite="Strict",
            max_age=7 * 24 * 3600,
            path="/",
        )
        return response

class UserViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def info(self, request):
        """
        Get user info based on student_id

        GET /api/user/info/
        """

        student_id = request.query_params.get("student_id")
        info = CustomUser.objects.get(id=student_id)

        serializer = UserSerializer(info)
        return Response(serializer.data)
