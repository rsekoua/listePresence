"""Tests des exports (Sprint 6)."""

from datetime import timedelta

from django.test import Client, TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.activites.models import Activite
from apps.participants.models import Participant
from apps.testutils import bearer

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class ExportTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.org = User.objects.create_user(
            username="org", email="o@x.ci", password="x", role="organisateur"
        )
        self.orgB = User.objects.create_user(
            username="orgB", email="ob@x.ci", password="x", role="organisateur"
        )
        now = timezone.now()
        self.act = Activite.objects.create(
            nom="Atelier", ville="Abidjan", lieu="Hôtel", date_debut=now,
            date_fin=now + timedelta(hours=2), statut="ouvert", created_by=self.org,
        )
        self.participant = Participant.objects.create(
            activite=self.act, nom="Kouassi", prenom="Awa", structure="ONG",
            fonction="Coord", telephone_wave="+2250701020304", email="a@x.ci",
            numero_cni="CI123",
        )

    def test_export_excel(self):
        r = self.client.get(f"/api/exports/activites/{self.act.id}/excel", **bearer(self.org))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], XLSX)

    def test_export_pdf_liste(self):
        r = self.client.get(f"/api/exports/activites/{self.act.id}/pdf-liste", **bearer(self.org))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/pdf")

    def test_export_zip(self):
        r = self.client.get(f"/api/exports/activites/{self.act.id}/zip", **bearer(self.org))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/zip")

    def test_export_qrcode_pdf(self):
        r = self.client.get(f"/api/exports/activites/{self.act.id}/qrcode-pdf", **bearer(self.org))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/pdf")

    def test_export_participant_pdf(self):
        r = self.client.get(
            f"/api/exports/participants/{self.participant.id}/pdf", **bearer(self.org)
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/pdf")

    def test_export_autre_organisateur_404(self):
        r = self.client.get(f"/api/exports/activites/{self.act.id}/excel", **bearer(self.orgB))
        self.assertEqual(r.status_code, 404)

    def test_export_sans_auth_401(self):
        r = self.client.get(f"/api/exports/activites/{self.act.id}/excel")
        self.assertEqual(r.status_code, 401)

    def test_historique_trace_les_exports(self):
        # Aucun export au départ
        h0 = self.client.get(f"/api/exports/activites/{self.act.id}/historique", **bearer(self.org))
        self.assertEqual(h0.json(), [])
        # On déclenche un export Excel
        self.client.get(f"/api/exports/activites/{self.act.id}/excel", **bearer(self.org))
        h1 = self.client.get(f"/api/exports/activites/{self.act.id}/historique", **bearer(self.org)).json()
        self.assertEqual(len(h1), 1)
        self.assertEqual(h1[0]["type"], "excel")
        self.assertEqual(h1[0]["nb_entrees"], 1)
        self.assertEqual(h1[0]["utilisateur"], "org")

    def test_historique_autre_organisateur_404(self):
        r = self.client.get(
            f"/api/exports/activites/{self.act.id}/historique", **bearer(self.orgB)
        )
        self.assertEqual(r.status_code, 404)
