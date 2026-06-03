from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "is_active", "is_staff", "created_at")
    list_filter = ("role", "is_active", "is_staff", "is_superuser")
    search_fields = ("username", "email")
    ordering = ("-created_at",)
    readonly_fields = ("created_at",)
    fieldsets = UserAdmin.fieldsets + (("Rôle applicatif", {"fields": ("role",)}),)
