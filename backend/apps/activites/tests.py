"""Tests RBAC et CRUD des activités (Sprint 6)."""

import json
from datetime import timedelta

from django.test import Client, TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.activites.models import Activite
from apps.testutils import bearer


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
