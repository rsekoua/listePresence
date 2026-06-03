from django.contrib import admin

from .models import Participant


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = (
        "nom",
        "prenom",
        "structure",
        "telephone_wave",
        "numero_cni",
        "activite",
        "horodatage",
    )
    list_filter = ("activite", "structure")
    search_fields = ("nom", "prenom", "email", "numero_cni", "telephone_wave")
    readonly_fields = ("id", "horodatage", "ip_address")
    date_hierarchy = "horodatage"
