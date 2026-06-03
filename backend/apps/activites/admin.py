from django.contrib import admin

from .models import Activite


@admin.register(Activite)
class ActiviteAdmin(admin.ModelAdmin):
    list_display = ("nom", "lieu", "date_debut", "date_fin", "statut", "created_by")
    list_filter = ("statut", "created_by")
    search_fields = ("nom", "lieu")
    readonly_fields = ("id", "token_qr", "created_at", "updated_at")
    date_hierarchy = "date_debut"
