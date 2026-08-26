"""Tests du formulaire public de collecte (Sprint 6)."""

import io
import tempfile
import uuid
from datetime import timedelta

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone
from PIL import Image

from apps.accounts.models import User
from apps.activites.models import Activite
from apps.participants.models import Participant
from apps.testutils import fake_image

MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MEDIA)
class PublicFormTests(TestCase):
    def setUp(self):
        cache.clear()  # le compteur anti-spam est partagé entre tests
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
        self.act2 = Activite.objects.create(
            nom="B", ville="Bouaké", lieu="H", date_debut=now,
            date_fin=now + timedelta(hours=2), statut="ouvert", created_by=org,
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

    def test_image_content_type_generique_accepte(self):
        """Régression : une vraie image envoyée avec un Content-Type non
        « image/* » (cas fréquent selon navigateur/mobile) doit être acceptée,
        la validation reposant sur Pillow et non sur l'en-tête déclaré."""
        r = self.client.post(
            f"/api/public/activite/{self.act.token_qr}/participer",
            data={
                "nom": "Kouassi", "prenom": "Awa", "structure": "ONG",
                "fonction": "Coordinatrice", "telephone_wave": "0701020304",
                "email": "awa@x.ci", "numero_cni": "CI777111",
                "photo_cni_recto": SimpleUploadedFile(
                    "r.jpg", fake_image(), "application/octet-stream"
                ),
                "photo_cni_verso": SimpleUploadedFile(
                    "v.jpg", fake_image(), "application/octet-stream"
                ),
            },
        )
        self.assertEqual(r.status_code, 201)

    @override_settings(PUBLIC_RATELIMIT=2, PUBLIC_RATELIMIT_WINDOW=300)
    def test_anti_spam_limite_les_soumissions(self):
        """Au-delà du quota par IP, les soumissions publiques sont bloquées (429)."""
        self.assertEqual(self._submit(self.act.token_qr, cni="CI0001").status_code, 201)
        self.assertEqual(self._submit(self.act.token_qr, cni="CI0002").status_code, 201)
        self.assertEqual(self._submit(self.act.token_qr, cni="CI0003").status_code, 429)

    def test_fichier_non_image_refuse(self):
        """Un fichier qui n'est pas réellement une image reste rejeté (422)."""
        r = self.client.post(
            f"/api/public/activite/{self.act.token_qr}/participer",
            data={
                "nom": "Kouassi", "prenom": "Awa", "structure": "ONG",
                "fonction": "Coordinatrice", "telephone_wave": "0701020304",
                "email": "awa@x.ci", "numero_cni": "CI777222",
                "photo_cni_recto": SimpleUploadedFile(
                    "r.jpg", b"pas une image", "image/jpeg"
                ),
                "photo_cni_verso": SimpleUploadedFile(
                    "v.jpg", fake_image(), "image/jpeg"
                ),
            },
        )
        self.assertEqual(r.status_code, 422)

    def test_image_trop_volumineuse_refusee(self):
        """Un fichier au-delà de la taille maximale est rejeté (422)."""
        gros = SimpleUploadedFile(
            "r.jpg", b"\xff\xd8\xff" + b"0" * (10 * 1024 * 1024 + 1), "image/jpeg"
        )
        r = self.client.post(
            f"/api/public/activite/{self.act.token_qr}/participer",
            data={
                "nom": "Kouassi", "prenom": "Awa", "structure": "ONG",
                "fonction": "Coordinatrice", "telephone_wave": "0701020304",
                "email": "awa@x.ci", "numero_cni": "CI777333",
                "photo_cni_recto": gros,
                "photo_cni_verso": SimpleUploadedFile("v.jpg", fake_image(), "image/jpeg"),
            },
        )
        self.assertEqual(r.status_code, 422)

    def test_prefill_retrouve_participant_dune_autre_activite(self):
        """Un participant déjà connu (autre activité) peut être pré-rempli
        pour une nouvelle activité, à partir de son seul numéro de CNI."""
        self._submit(self.act.token_qr, cni="CI555000")
        r = self.client.get(
            f"/api/public/activite/{self.act2.token_qr}/personne/CI555000"
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["nom"], "Kouassi")
        self.assertEqual(body["prenom"], "Awa")
        self.assertEqual(body["telephone_wave"], "+2250701020304")
        # Ni les photos ni le numéro de CNI (déjà saisi par l'appelant) ne sont renvoyés.
        self.assertNotIn("numero_cni", body)
        self.assertNotIn("photo_cni_recto", body)

    def test_prefill_numero_inconnu_404(self):
        r = self.client.get(
            f"/api/public/activite/{self.act.token_qr}/personne/CI000000"
        )
        self.assertEqual(r.status_code, 404)

    def test_prefill_collecte_fermee_refuse(self):
        self._submit(self.act.token_qr, cni="CI555001")
        r = self.client.get(
            f"/api/public/activite/{self.closed.token_qr}/personne/CI555001"
        )
        self.assertEqual(r.status_code, 403)

    @override_settings(PREFILL_RATELIMIT=2, PREFILL_RATELIMIT_WINDOW=300)
    def test_prefill_anti_spam_limite_les_requetes(self):
        """Le pré-remplissage a sa propre limite de débit, plus basse que la
        soumission (anti-énumération des numéros de CNI)."""
        self._submit(self.act.token_qr, cni="CI555002")
        url = f"/api/public/activite/{self.act.token_qr}/personne/CI555002"
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.get(url).status_code, 429)

    @override_settings(PREFILL_RATELIMIT=2, PREFILL_RATELIMIT_WINDOW=300)
    def test_prefill_quota_non_multipliable_en_changeant_activite(self):
        """Le quota est posé par (IP, activité) : une fois épuisé sur une
        activité, il ne se recharge pas en passant au token d'une autre."""
        autre = Activite.objects.create(
            nom="Autre activité",
            date_debut=timezone.now(),
            date_fin=timezone.now() + timedelta(hours=2),
            ville="Abidjan",
            lieu="Salle B",
            created_by=self.act.created_by,
            statut=Activite.Statut.OUVERT,
        )
        self._submit(self.act.token_qr, cni="CI555003")
        url = f"/api/public/activite/{self.act.token_qr}/personne/CI555003"
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.get(url).status_code, 429)
        # Un autre token repart sur son propre compteur, mais le premier reste
        # bloqué : le moissonnage global est borné par activité visée.
        autre_url = f"/api/public/activite/{autre.token_qr}/personne/CI555003"
        self.assertEqual(self.client.get(autre_url).status_code, 200)
        self.assertEqual(self.client.get(url).status_code, 429)

    def test_image_avec_orientation_exif_acceptee(self):
        """Une image porteuse d'un tag EXIF d'orientation est traitée sans erreur."""
        buf = io.BytesIO()
        im = Image.new("RGB", (600, 400), (150, 150, 150))
        exif = im.getexif()
        exif[274] = 6  # Orientation : rotation de 90°
        im.save(buf, "JPEG", exif=exif)
        data = buf.getvalue()
        r = self.client.post(
            f"/api/public/activite/{self.act.token_qr}/participer",
            data={
                "nom": "Kouassi", "prenom": "Awa", "structure": "ONG",
                "fonction": "Coordinatrice", "telephone_wave": "0701020304",
                "email": "awa@x.ci", "numero_cni": "CI777444",
                "photo_cni_recto": SimpleUploadedFile("r.jpg", data, "image/jpeg"),
                "photo_cni_verso": SimpleUploadedFile("v.jpg", data, "image/jpeg"),
            },
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json().get("id"))
