
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers

User = get_user_model()


class EmailOrUsernameTokenSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        login_value = attrs.get(self.username_field)

        if login_value and "@" in login_value:
            user = User.objects.filter(email__iexact=login_value).first()

            if user:
                attrs[self.username_field] = getattr(
                    user, User.USERNAME_FIELD
                )

        return super().validate(attrs)