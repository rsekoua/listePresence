"""Seeder de données de démonstration.

Crée 2 organisateurs (orga1, orga2) — et inclut les organisateurs déjà
existants — puis, pour chaque organisateur, 3 à 6 activités contenant chacune
20 à 30 participants (tirés d'un même vivier pour simuler des participants
récurrents d'une activité à l'autre).

Exécution :
    python manage.py seed_demo
    python manage.py seed_demo --reset   # vide d'abord activités + participants
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.activites.models import Activite
from apps.participants.models import Participant

MOT_DE_PASSE = "password@123"

NOMS = [
    "Kouassi", "Koffi", "Diabaté", "Traoré", "Touré", "Bamba", "Coulibaly",
    "Yao", "Aka", "N'Guessan", "Ouattara", "Konan", "Soro", "Diallo", "Cissé",
    "Kone", "Gnagne", "Doumbia", "Adou", "Brou",
]
PRENOMS = [
    "Awa", "Moussa", "Fatou", "Yao", "Aya", "Ibrahim", "Mariam", "Kévin",
    "Adjoua", "Sékou", "Affoué", "Jean", "Rokia", "Serge", "Aminata", "Eric",
    "Mariama", "Franck", "Nadège", "Hervé",
]
STRUCTURES = [
    "Ministère de l'Agriculture", "ONG Solidarité", "Mairie d'Abidjan",
    "Conseil Régional", "ANADER", "Coopérative Café-Cacao", "PNUD",
    "Chambre de Commerce", "Université FHB", "Direction Régionale Santé",
]
FONCTIONS = [
    "Coordinateur", "Chargé de projet", "Animateur", "Directeur", "Agent",
    "Assistant", "Superviseur", "Technicien", "Responsable suivi-évaluation",
    "Secrétaire",
]
VILLES = [
    "Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Korhogo", "Daloa",
    "Man", "Gagnoa",
]
LIEUX = [
    "Hôtel Ivoire", "Salle de conférence", "Centre culturel", "Hôtel Pullman",
    "Espace Latrille", "Palais des Congrès", "Foyer des jeunes",
]
THEMES = [
    "Atelier de formation", "Séminaire régional", "Réunion de coordination",
    "Renforcement de capacités", "Journée de sensibilisation",
    "Table ronde", "Forum des acteurs",
]


def _vivier(taille=120):
    """Vivier de personnes distinctes (CNI unique) réutilisées entre activités."""
    gens = []
    for i in range(taille):
        gens.append(
            {
                "nom": random.choice(NOMS),
                "prenom": random.choice(PRENOMS),
                "structure": random.choice(STRUCTURES),
                "fonction": random.choice(FONCTIONS),
                "telephone_wave": "+225" + "".join(random.choice("0123456789") for _ in range(10)),
                "email": f"participant{i}@example.ci",
                "numero_cni": f"CI{1000000 + i}",
            }
        )
    return gens


class Command(BaseCommand):
    help = "Crée des données de démonstration (organisateurs, activités, participants)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime les activités et participants existants avant de semer.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            n_p = Participant.objects.count()
            n_a = Activite.objects.count()
            Participant.objects.all().delete()
            Activite.objects.all().delete()
            self.stdout.write(f"Réinitialisation : {n_a} activités et {n_p} participants supprimés.")

        # --- Organisateurs : orga1, orga2 (+ existants) ---------------------
        organisateurs = []
        for uname in ("orga1", "orga2"):
            user, created = User.objects.get_or_create(
                username=uname,
                defaults={"email": f"{uname}@example.ci", "role": User.Role.ORGANISATEUR},
            )
            if created:
                user.set_password(MOT_DE_PASSE)
                user.save()
                self.stdout.write(f"Organisateur créé : {uname} / {MOT_DE_PASSE}")
            organisateurs.append(user)

        for user in User.objects.filter(role=User.Role.ORGANISATEUR).exclude(
            username__in=("orga1", "orga2")
        ):
            organisateurs.append(user)

        # --- Génération ------------------------------------------------------
        vivier = _vivier()
        now = timezone.now()
        total_act = 0
        total_part = 0

        for org in organisateurs:
            for _ in range(random.randint(3, 6)):
                debut = now + timedelta(days=random.randint(-30, 30), hours=random.randint(8, 16))
                activite = Activite.objects.create(
                    nom=f"{random.choice(THEMES)} — {random.choice(VILLES)}",
                    description="Activité de démonstration générée automatiquement.",
                    ville=random.choice(VILLES),
                    lieu=random.choice(LIEUX),
                    date_debut=debut,
                    date_fin=debut + timedelta(hours=random.randint(2, 8)),
                    statut=random.choice(["ouvert", "ouvert", "ferme"]),
                    created_by=org,
                )
                total_act += 1

                nb = random.randint(20, 30)
                personnes = random.sample(vivier, nb)
                Participant.objects.bulk_create(
                    [Participant(activite=activite, **p) for p in personnes]
                )
                total_part += nb

        self.stdout.write(
            self.style.SUCCESS(
                f"OK — {len(organisateurs)} organisateur(s), {total_act} activités, "
                f"{total_part} participants créés."
            )
        )
