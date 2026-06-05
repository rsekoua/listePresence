"""Tests du formulaire public de collecte (Sprint 6)."""

import tempfile
import uuid
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from apps.accounts.models import User
from apps.activites.models import Activite
from apps.participants.models import Participant
from apps.testutils import fake_image

MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MEDIA)
class PublicFormTests(TestCase):
    def setUp(self):
        self.client = Client()
        org = User.objects.create_user(
            username="org", email="o@x.ci", password="x", role="organisateur"
        )
        now = timezone.now()
        self.act = Activite.objects.create(
            nom="A", ville="Abidjan", lieu="H", date_debut=now,
            date_fin=now + timedelta(hours=2), statut="ouvert", created_by=org,
        )
        self.closed = Activite.objects.create(
            nom="C", ville="Abidjan", lieu="H", date_debut=now,
            date_fin=now + timedelta(hours=2), statut="ferme", created_by=org,
        )

    def _submit(self, token, cni="CI123456", tel="0701020304"):
        return self.client.post(
            f"/api/public/activite/{token}/participer",
            data={
                "nom": "Kouassi",
                "prenom": "Awa",
                "structure": "ONG",
                "fonction": "Coordinatrice",
                "telephone_wave": tel,
                "email": "awa@x.ci",
                "numero_cni": cni,
                "photo_cni_recto": SimpleUploadedFile("r.jpg", fake_image(), "image/jpeg"),
                "photo_cni_verso": SimpleUploadedFile("v.jpg", fake_image(), "image/jpeg"),
            },
        )

    def test_get_activite_publique(self):
        r = self.client.get(f"/api/public/activite/{self.act.token_qr}")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["is_open"])
        self.assertEqual(r.json()["ville"], "Abidjan")

    def test_token_inconnu_404(self):
        r = self.client.get(f"/api/public/activite/{uuid.uuid4()}")
        self.assertEqual(r.status_code, 404)

    def test_soumission_ok(self):
        r = self._submit(self.act.token_qr)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Participant.objects.filter(activite=self.act).count(), 1)

    def test_anti_doublon_cni(self):
        self._submit(self.act.token_qr)
        r = self._submit(self.act.token_qr)
        self.assertEqual(r.status_code, 409)

    def test_collecte_fermee_refuse(self):
        r = self._submit(self.closed.token_qr)
        self.assertEqual(r.status_code, 403)

    def test_telephone_invalide(self):
        r = self._submit(self.act.token_qr, tel="123")
        self.assertEqual(r.status_code, 422)
