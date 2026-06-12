"""Tests RBAC et CRUD des activités (Sprint 6)."""

import json
import tempfile
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from apps.accounts.models import AuditLog, User
from apps.activites.models import Activite
from apps.participants.models import Participant
from apps.testutils import bearer, fake_image


def make_activite(owner, statut="ouvert", nom="Activité"):
    now = timezone.now()
    return Activite.objects.create(
        nom=nom,
        ville="Abidjan",
        lieu="Hôtel",
        date_debut=now,
        date_fin=now + timedelta(hours=2),
        statut=statut,
        created_by=owner,
    )


class ActiviteRBACTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_user(
            username="admin", email="a@x.ci", password="x", role="admin"
        )
        self.orgA = User.objects.create_user(
            username="orgA", email="oa@x.ci", password="x", role="organisateur"
        )
        self.orgB = User.objects.create_user(
            username="orgB", email="ob@x.ci", password="x", role="organisateur"
        )
        self.a_open = make_activite(self.orgA, "ouvert", "A ouverte")
        self.a_closed = make_activite(self.orgA, "ferme", "A fermée")
        self.b_open = make_activite(self.orgB, "ouvert", "B ouverte")

    def test_organisateur_ne_voit_que_les_siennes(self):
        r = self.client.get("/api/activites/", **bearer(self.orgA))
        noms = {a["nom"] for a in r.json()}
        self.assertEqual(noms, {"A ouverte", "A fermée"})

    def test_admin_voit_tout(self):
        r = self.client.get("/api/activites/", **bearer(self.admin))
        self.assertEqual(len(r.json()), 3)

    def test_organisateur_ne_voit_pas_activite_autrui(self):
        r = self.client.get(f"/api/activites/{self.b_open.id}", **bearer(self.orgA))
        self.assertEqual(r.status_code, 404)

    def test_can_edit_false_sur_activite_fermee(self):
        r = self.client.get(f"/api/activites/{self.a_closed.id}", **bearer(self.orgA))
        self.assertFalse(r.json()["can_edit"])

    def test_organisateur_ne_modifie_pas_activite_fermee(self):
        r = self.client.patch(
            f"/api/activites/{self.a_closed.id}/statut",
            json.dumps({"statut": "ouvert"}),
            content_type="application/json",
            **bearer(self.orgA),
        )
        self.assertEqual(r.status_code, 403)

    def test_admin_rouvre_activite_fermee(self):
        r = self.client.patch(
            f"/api/activites/{self.a_closed.id}/statut",
            json.dumps({"statut": "ouvert"}),
            content_type="application/json",
            **bearer(self.admin),
        )
        self.assertEqual(r.status_code, 200)
        self.a_closed.refresh_from_db()
        self.assertEqual(self.a_closed.statut, "ouvert")

    def test_creation_activite(self):
        now = timezone.now()
        r = self.client.post(
            "/api/activites/",
            json.dumps(
                {
                    "nom": "Nouvelle",
                    "ville": "Bouaké",
                    "lieu": "Salle",
                    "date_debut": now.isoformat(),
                    "date_fin": (now + timedelta(hours=3)).isoformat(),
                }
            ),
            content_type="application/json",
            **bearer(self.orgA),
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["created_by"]["username"], "orgA")
        self.assertEqual(r.json()["ville"], "Bouaké")

    def test_clone_appartient_au_cloneur(self):
        r = self.client.post(f"/api/activites/{self.a_open.id}/clone", **bearer(self.orgA))
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["statut"], "ouvert")
        self.assertIn("copie", r.json()["nom"])

    def test_annuaire_scope_par_organisateur(self):
        Participant.objects.create(
            activite=self.a_open, nom="Kouassi", prenom="Awa", structure="ONG",
            fonction="C", telephone_wave="+2250700000000", email="a@x.ci", numero_cni="CI_A",
        )
        Participant.objects.create(
            activite=self.b_open, nom="Diallo", prenom="Moussa", structure="Mairie",
            fonction="A", telephone_wave="+2250101010101", email="m@x.ci", numero_cni="CI_B",
        )
        # orgA ne voit que son participant
        ra = self.client.get("/api/activites/personnes", **bearer(self.orgA)).json()
        self.assertEqual({p["numero_cni"] for p in ra}, {"CI_A"})
        # admin voit les deux
        radmin = self.client.get("/api/activites/personnes", **bearer(self.admin)).json()
        self.assertEqual({p["numero_cni"] for p in radmin}, {"CI_A", "CI_B"})
        # historique d'une CNI d'autrui → 404 pour orgA
        h = self.client.get(
            "/api/activites/personnes/historique?numero_cni=CI_B", **bearer(self.orgA)
        )
        self.assertEqual(h.status_code, 404)

    def test_stats_globales_scope_par_role(self):
        Participant.objects.create(
            activite=self.a_open, nom="Kouassi", prenom="Awa", structure="ONG",
            fonction="C", telephone_wave="+2250700000000", email="a@x.ci", numero_cni="CNI_A",
        )
        Participant.objects.create(
            activite=self.b_open, nom="Diallo", prenom="Moussa", structure="Mairie",
            fonction="A", telephone_wave="+2250101010101", email="m@x.ci", numero_cni="CNI_B",
        )
        # orgA : ses 2 activités, 1 participant unique (le sien uniquement)
        ra = self.client.get("/api/activites/stats-globales", **bearer(self.orgA)).json()
        self.assertEqual(ra["nb_activites"], 2)
        self.assertEqual(ra["nb_participants_uniques"], 1)
        # admin : les 3 activités, 2 participants uniques
        radmin = self.client.get("/api/activites/stats-globales", **bearer(self.admin)).json()
        self.assertEqual(radmin["nb_activites"], 3)
        self.assertEqual(radmin["nb_participants_uniques"], 2)
        # Champs enrichis (tableau de bord)
        self.assertEqual(radmin["nb_inscriptions"], 2)
        self.assertEqual(radmin["cni_total"], 2)
        self.assertEqual(radmin["cni_completes"], 0)  # pas de photos sur ces deux-là
        self.assertEqual(len(radmin["inscriptions_30j"]), 30)
        self.assertEqual(sum(j["total"] for j in radmin["inscriptions_30j"]), 2)
        # orgA ne voit que sa propre inscription
        self.assertEqual(ra["nb_inscriptions"], 1)

    def test_liste_activites_pas_de_n_plus_1(self):
        """Le nombre de requêtes ne doit pas croître avec le nombre d'activités."""
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as ctx1:
            self.client.get("/api/activites/", **bearer(self.admin))
        # Ajout de plusieurs activités supplémentaires
        for i in range(5):
            make_activite(self.orgB, nom=f"extra {i}")
        with CaptureQueriesContext(connection) as ctx2:
            self.client.get("/api/activites/", **bearer(self.admin))
        self.assertEqual(len(ctx2), len(ctx1))


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class AjoutManuelParticipantTests(TestCase):
    """Ajout manuel d'un participant (multipart, photos CNI facultatives)."""

    def setUp(self):
        self.client = Client()
        self.org = User.objects.create_user(
            username="org", email="o@x.ci", password="x", role="organisateur"
        )
        self.act = make_activite(self.org, "ouvert", "Atelier")

    BASE = {
        "nom": "Kouassi",
        "prenom": "Awa",
        "structure": "ONG",
        "fonction": "Coordinatrice",
        "telephone_wave": "0701020304",
        "email": "awa@x.ci",
        "numero_cni": "CI123456",
    }

    def _add(self, **extra):
        return self.client.post(
            f"/api/activites/{self.act.id}/participants",
            data={**self.BASE, **extra},
            **bearer(self.org),
        )

    def _update(self, pid, **extra):
        return self.client.post(
            f"/api/activites/{self.act.id}/participants/{pid}",
            data={**self.BASE, **extra},
            **bearer(self.org),
        )

    def test_ajout_sans_photo(self):
        r = self._add()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertFalse(r.json()["cni_complete"])
        p = Participant.objects.get(activite=self.act)
        self.assertEqual(p.telephone_wave, "+2250701020304")
        self.assertFalse(p.photo_cni_recto)

    def test_ajout_avec_photos(self):
        r = self._add(
            numero_cni="CI999",
            photo_cni_recto=SimpleUploadedFile("r.jpg", fake_image(), "image/jpeg"),
            photo_cni_verso=SimpleUploadedFile("v.jpg", fake_image(), "image/jpeg"),
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()["cni_complete"])
        p = Participant.objects.get(numero_cni="CI999")
        self.assertTrue(p.photo_cni_recto)
        self.assertTrue(p.photo_cni_verso)

    def test_anti_doublon_cni(self):
        self.assertEqual(self._add().status_code, 201)
        self.assertEqual(self._add().status_code, 409)

    def test_telephone_invalide_422(self):
        self.assertEqual(self._add(telephone_wave="123").status_code, 422)

    # --- Modification d'un participant -------------------------------------

    def test_update_champs(self):
        pid = self._add().json()["id"]
        r = self._update(pid, fonction="Directrice", email="awa2@x.ci")
        self.assertEqual(r.status_code, 200, r.content)
        p = Participant.objects.get(id=pid)
        self.assertEqual(p.fonction, "Directrice")
        self.assertEqual(p.email, "awa2@x.ci")

    def test_update_ajoute_cni_a_posteriori(self):
        pid = self._add().json()["id"]  # saisi sans photo
        self.assertFalse(Participant.objects.get(id=pid).photo_cni_recto)
        r = self._update(
            pid,
            photo_cni_recto=SimpleUploadedFile("r.jpg", fake_image(), "image/jpeg"),
            photo_cni_verso=SimpleUploadedFile("v.jpg", fake_image(), "image/jpeg"),
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.json()["cni_complete"])
        p = Participant.objects.get(id=pid)
        self.assertTrue(p.photo_cni_recto)
        self.assertTrue(p.photo_cni_verso)

    def test_update_conserve_photos_si_absentes(self):
        pid = self._add(
            photo_cni_recto=SimpleUploadedFile("r.jpg", fake_image(), "image/jpeg"),
            photo_cni_verso=SimpleUploadedFile("v.jpg", fake_image(), "image/jpeg"),
        ).json()["id"]
        r = self._update(pid, fonction="Chef")  # MAJ texte seule, sans photo
        self.assertEqual(r.status_code, 200, r.content)
        p = Participant.objects.get(id=pid)
        self.assertTrue(p.photo_cni_recto)
        self.assertTrue(p.photo_cni_verso)

    def test_update_anti_doublon(self):
        self.assertEqual(self._add(numero_cni="CNIA").status_code, 201)
        pid_b = self._add(numero_cni="CNIB").json()["id"]
        r = self._update(pid_b, numero_cni="CNIA")
        self.assertEqual(r.status_code, 409)

    def test_ajout_et_modification_tracees(self):
        pid = self._add().json()["id"]
        self.assertTrue(
            AuditLog.objects.filter(action="participant_create", username="org").exists()
        )
        self._update(pid, fonction="Directrice")
        self.assertTrue(
            AuditLog.objects.filter(action="participant_update", username="org").exists()
        )
