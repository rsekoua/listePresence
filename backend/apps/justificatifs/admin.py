from django.contrib import admin

from .models import Justificatif, PieceJointe


class PieceJointeInline(admin.TabularInline):
    model = PieceJointe
    extra = 0
    readonly_fields = ("id", "created_at")


@admin.register(Justificatif)
class JustificatifAdmin(admin.ModelAdmin):
    list_display = ("categorie", "equipe", "activite", "montant_total", "created_at")
    list_filter = ("categorie", "activite")
    search_fields = ("equipe", "activite__nom")
    readonly_fields = ("id", "created_at")
    inlines = [PieceJointeInline]


@admin.register(PieceJointe)
class PieceJointeAdmin(admin.ModelAdmin):
    list_display = ("libelle", "justificatif", "montant", "content_type", "created_at")
    list_filter = ("content_type",)
    readonly_fields = ("id", "created_at")
