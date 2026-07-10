"""Tests des justificatifs de dépenses (missions terrain)."""

import json
import tempfile
from datetime import timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from apps.accounts.models import User
from apps.activites.models import Activite
from apps.justificatifs.models import Justificatif, PieceJointe
from apps.testutils import bearer, fake_image

MEDIA = tempfile.mkdtemp()

PDF_BYTES = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


def make_mission(owner, type_mission="terrain", budget=None, nom="Mission"):
    now = timezone.now()
    return Activite.objects.create(
        nom=nom,
        ville="Abidjan",
        lieu="Terrain",
        date_debut=now,
        date_fin=now + timedelta(hours=8),
        statut="ouvert",
        type_mission=type_mission,
        budget_alloue=budget,
        created_by=owner,
    )


@override_settings(MEDIA_ROOT=MEDIA)
class JustificatifTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.org = User.objects.create_user(
            username="org", email="o@x.ci", password="x", role="organisateur"
        )
        self.other = User.objects.create_user(
            username="other", email="ot@x.ci", password="x", role="organisateur"
        )
        self.mission = make_mission(self.org, budget=Decimal("100000"))

    def _create(self, mission, categorie, **extra):
        payload = {"categorie": categorie, **extra}
        return self.client.post(
            f"/api/activites/{mission.id}/justificatifs",
            json.dumps(payload),
            content_type="application/json",
            **bearer(self.org),
        )

    def test_refuse_sur_atelier(self):
        atelier = make_mission(self.org, type_mission="atelier", nom="Atelier")
        r = self._create(atelier, "carburant")
        self.assertEqual(r.status_code, 400)

    def test_creation_poste_carburant(self):
        r = self._create(self.mission, "carburant", equipe="Équipe A")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["categorie"], "carburant")
        self.assertEqual(r.json()["equipe"], "Équipe A")

    def test_montant_justifie_carburant_somme_des_recus(self):
        jid = self._create(self.mission, "carburant").json()["id"]
        for montant, blob, name, ctype in [
            ("15000", fake_image(), "recu1.jpg", "image/jpeg"),
            ("8000", PDF_BYTES, "recu2.pdf", "application/pdf"),
        ]:
            r = self.client.post(
                f"/api/activites/{self.mission.id}/justificatifs/{jid}/pieces",
                {
                    "montant": montant,
                    "fichier": SimpleUploadedFile(name, blob, content_type=ctype),
                },
                **bearer(self.org),
            )
            self.assertEqual(r.status_code, 201, r.content)
        data = r.json()
        self.assertEqual(len(data["pieces"]), 2)
        self.assertEqual(Decimal(data["montant_justifie"]), Decimal("23000"))

    def test_perdiem_montant_total(self):
        jid = self._create(
            self.mission, "perdiem", montant_total="50000"
        ).json()["id"]
        r = self.client.post(
            f"/api/activites/{self.mission.id}/justificatifs/{jid}/pieces",
            {"fichier": SimpleUploadedFile("emargement.pdf", PDF_BYTES, content_type="application/pdf")},
            **bearer(self.org),
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Decimal(r.json()["montant_justifie"]), Decimal("50000"))

    def test_conciliation(self):
        jid = self._create(self.mission, "carburant").json()["id"]
        self.client.post(
            f"/api/activites/{self.mission.id}/justificatifs/{jid}/pieces",
            {"montant": "40000", "fichier": SimpleUploadedFile("r.jpg", fake_image(), content_type="image/jpeg")},
            **bearer(self.org),
        )
        self._create(self.mission, "perdiem", montant_total="20000")
        r = self.client.get(
            f"/api/activites/{self.mission.id}/conciliation", **bearer(self.org)
        )
        data = r.json()
        self.assertEqual(Decimal(data["montant_justifie"]), Decimal("60000"))
        self.assertEqual(Decimal(data["budget_alloue"]), Decimal("100000"))
        self.assertEqual(data["taux"], 60.0)
        self.assertEqual(Decimal(data["reste_a_justifier"]), Decimal("40000"))

    def test_rejet_fichier_non_supporte(self):
        jid = self._create(self.mission, "carburant").json()["id"]
        r = self.client.post(
            f"/api/activites/{self.mission.id}/justificatifs/{jid}/pieces",
            {"fichier": SimpleUploadedFile("virus.exe", b"MZ\x00\x00", content_type="application/octet-stream")},
            **bearer(self.org),
        )
        self.assertEqual(r.status_code, 422)

    def test_autre_organisateur_interdit(self):
        r = self.client.post(
            f"/api/activites/{self.mission.id}/justificatifs",
            json.dumps({"categorie": "carburant"}),
            content_type="application/json",
            **bearer(self.other),
        )
        # 404 : la mission d'autrui n'est même pas visible.
        self.assertEqual(r.status_code, 404)

    def test_suppression(self):
        jid = self._create(self.mission, "peage").json()["id"]
        r = self.client.delete(
            f"/api/activites/{self.mission.id}/justificatifs/{jid}",
            **bearer(self.org),
        )
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Justificatif.objects.filter(id=jid).exists())
