"""Tests d'authentification et de gestion des comptes (Sprint 6)."""

import json

import jwt
from django.conf import settings
from django.core.cache import cache
from django.test import Client, TestCase, override_settings

from apps.accounts.models import AuditLog, User
from apps.testutils import bearer


def jpost(client, url, data, **extra):
    return client.post(url, json.dumps(data), content_type="application/json", **extra)


class AuthTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.org = User.objects.create_user(
            username="org", email="o@x.ci", password="password@123", role="organisateur"
        )

    def test_login_ok(self):
        r = jpost(self.client, "/api/auth/login", {"username": "org", "password": "password@123"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.json())

    def test_login_invalide(self):
        r = jpost(self.client, "/api/auth/login", {"username": "org", "password": "faux"})
        self.assertEqual(r.status_code, 401)

    def test_me_authentifie(self):
        r = self.client.get("/api/auth/me", **bearer(self.org))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["username"], "org")

    def test_me_sans_token(self):
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_change_password(self):
        r = jpost(
            self.client,
            "/api/auth/change-password",
            {"ancien_mot_de_passe": "password@123", "nouveau_mot_de_passe": "nouveau123"},
            **bearer(self.org),
        )
        self.assertEqual(r.status_code, 200)
        self.org.refresh_from_db()
        self.assertTrue(self.org.check_password("nouveau123"))

    def test_change_password_ancien_faux(self):
        r = jpost(
            self.client,
            "/api/auth/change-password",
            {"ancien_mot_de_passe": "faux", "nouveau_mot_de_passe": "nouveau123"},
            **bearer(self.org),
        )
        self.assertEqual(r.status_code, 400)

    def test_change_password_revoque_ancien_token(self):
        """Après changement, l'ancien jeton est révoqué et un nouveau est fourni."""
        ancien = bearer(self.org)
        r = jpost(
            self.client,
            "/api/auth/change-password",
            {"ancien_mot_de_passe": "password@123", "nouveau_mot_de_passe": "Korhogo!2026xyz"},
            **ancien,
        )
        self.assertEqual(r.status_code, 200)
        nouveau_access = r.json()["access"]
        # L'ancien jeton ne passe plus.
        self.assertEqual(self.client.get("/api/auth/me", **ancien).status_code, 401)
        # Le nouveau jeton renvoyé reste valide (session courante conservée).
        self.assertEqual(
            self.client.get(
                "/api/auth/me", HTTP_AUTHORIZATION=f"Bearer {nouveau_access}"
            ).status_code,
            200,
        )

    def test_change_password_trop_faible(self):
        """Un nouveau mot de passe trop court/courant est rejeté (validators Django)."""
        r = jpost(
            self.client,
            "/api/auth/change-password",
            {"ancien_mot_de_passe": "password@123", "nouveau_mot_de_passe": "12345"},
            **bearer(self.org),
        )
        self.assertEqual(r.status_code, 422)
        self.org.refresh_from_db()
        self.assertTrue(self.org.check_password("password@123"))  # inchangé


@override_settings(LOGIN_RATELIMIT=3, LOGIN_RATELIMIT_WINDOW=900)
class LoginRateLimitTests(TestCase):
    def setUp(self):
        cache.clear()  # compteur partagé entre tests : repartir de zéro
        self.client = Client()
        User.objects.create_user(
            username="org", email="o@x.ci", password="password@123", role="organisateur"
        )

    def tearDown(self):
        cache.clear()

    def test_blocage_apres_trop_d_echecs(self):
        for _ in range(3):
            r = jpost(self.client, "/api/auth/login", {"username": "org", "password": "faux"})
            self.assertEqual(r.status_code, 401)
        # Le 4e échec est bloqué avant même la vérification du mot de passe.
        r = jpost(self.client, "/api/auth/login", {"username": "org", "password": "faux"})
        self.assertEqual(r.status_code, 429)

    def test_succes_reinitialise_le_compteur(self):
        for _ in range(2):
            jpost(self.client, "/api/auth/login", {"username": "org", "password": "faux"})
        # Une connexion réussie remet le compteur à zéro…
        ok = jpost(self.client, "/api/auth/login", {"username": "org", "password": "password@123"})
        self.assertEqual(ok.status_code, 200)
        # … donc de nouveaux échecs repartent de zéro (pas de 429 immédiat).
        r = jpost(self.client, "/api/auth/login", {"username": "org", "password": "faux"})
        self.assertEqual(r.status_code, 401)


class UserManagementTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_user(
            username="admin", email="a@x.ci", password="password@123", role="admin"
        )
        self.org = User.objects.create_user(
            username="org", email="o@x.ci", password="password@123", role="organisateur"
        )

    def test_admin_cree_utilisateur(self):
        r = jpost(
            self.client,
            "/api/auth/users",
            {"username": "new", "email": "n@x.ci", "password": "password@123", "role": "organisateur"},
            **bearer(self.admin),
        )
        self.assertEqual(r.status_code, 201)
        self.assertTrue(User.objects.filter(username="new").exists())

    def test_creation_mot_de_passe_faible_refuse(self):
        r = jpost(
            self.client,
            "/api/auth/users",
            {"username": "new", "email": "n@x.ci", "password": "1234", "role": "organisateur"},
            **bearer(self.admin),
        )
        self.assertEqual(r.status_code, 422)
        self.assertFalse(User.objects.filter(username="new").exists())

    def test_reset_mot_de_passe_faible_refuse(self):
        r = jpost(
            self.client,
            f"/api/auth/users/{self.org.id}/reset-password",
            {"nouveau_mot_de_passe": "1234"},
            **bearer(self.admin),
        )
        self.assertEqual(r.status_code, 422)

    def test_reset_mot_de_passe_revoque_les_tokens(self):
        """La réinitialisation admin invalide les jetons existants de l'utilisateur."""
        token_org = bearer(self.org)
        self.assertEqual(self.client.get("/api/auth/me", **token_org).status_code, 200)
        r = jpost(
            self.client,
            f"/api/auth/users/{self.org.id}/reset-password",
            {"nouveau_mot_de_passe": "Korhogo!2026xyz"},
            **bearer(self.admin),
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me", **token_org).status_code, 401)

    def test_creation_doublon_username(self):
        r = jpost(
            self.client,
            "/api/auth/users",
            {"username": "org", "email": "autre@x.ci", "password": "password@123", "role": "organisateur"},
            **bearer(self.admin),
        )
        self.assertEqual(r.status_code, 409)

    def test_non_admin_interdit(self):
        self.assertEqual(self.client.get("/api/auth/users", **bearer(self.org)).status_code, 403)

    def test_desactivation(self):
        r = self.client.patch(
            f"/api/auth/users/{self.org.id}",
            json.dumps({"is_active": False}),
            content_type="application/json",
            **bearer(self.admin),
        )
        self.assertEqual(r.status_code, 200)
        self.org.refresh_from_db()
        self.assertFalse(self.org.is_active)

    def test_modification_nom_email_role(self):
        r = self.client.patch(
            f"/api/auth/users/{self.org.id}",
            json.dumps({"username": "org2", "email": "ORG2@x.ci", "role": "admin"}),
            content_type="application/json",
            **bearer(self.admin),
        )
        self.assertEqual(r.status_code, 200)
        self.org.refresh_from_db()
        self.assertEqual(self.org.username, "org2")
        self.assertEqual(self.org.email, "org2@x.ci")  # normalisé en minuscules
        self.assertEqual(self.org.role, "admin")

    def test_modification_username_en_doublon(self):
        r = self.client.patch(
            f"/api/auth/users/{self.org.id}",
            json.dumps({"username": "admin"}),  # déjà pris
            content_type="application/json",
            **bearer(self.admin),
        )
        self.assertEqual(r.status_code, 409)

    def test_admin_ne_se_desactive_pas(self):
        r = self.client.patch(
            f"/api/auth/users/{self.admin.id}",
            json.dumps({"is_active": False}),
            content_type="application/json",
            **bearer(self.admin),
        )
        self.assertEqual(r.status_code, 400)

    def test_admin_ne_se_supprime_pas(self):
        r = self.client.delete(f"/api/auth/users/{self.admin.id}", **bearer(self.admin))
        self.assertEqual(r.status_code, 400)

    def test_suppression_utilisateur(self):
        r = self.client.delete(f"/api/auth/users/{self.org.id}", **bearer(self.admin))
        self.assertEqual(r.status_code, 200)
        self.assertFalse(User.objects.filter(id=self.org.id).exists())


class PasswordResetLinkTests(TestCase):
    """Réinitialisation via lien à usage unique généré par un admin (sans email)."""

    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_user(
            username="admin", email="a@x.ci", password="password@123", role="admin"
        )
        self.org = User.objects.create_user(
            username="org", email="o@x.ci", password="password@123", role="organisateur"
        )

    def _generate_link(self) -> str:
        r = self.client.post(f"/api/auth/users/{self.org.id}/reset-link", **bearer(self.admin))
        self.assertEqual(r.status_code, 200)
        return r.json()["reset_url"].rsplit("/", 1)[-1]

    def test_admin_genere_un_lien(self):
        token = self._generate_link()
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        self.assertEqual(payload["type"], "pwd_reset")
        self.assertEqual(payload["sub"], str(self.org.id))

    def test_non_admin_ne_genere_pas_de_lien(self):
        r = self.client.post(f"/api/auth/users/{self.org.id}/reset-link", **bearer(self.org))
        self.assertEqual(r.status_code, 403)

    def test_confirmation_valide_permet_la_connexion(self):
        token = self._generate_link()
        r = jpost(
            self.client,
            "/api/auth/reset-password-confirm",
            {"token": token, "nouveau_mot_de_passe": "Korhogo!2026xyz"},
        )
        self.assertEqual(r.status_code, 200)
        self.org.refresh_from_db()
        self.assertTrue(self.org.check_password("Korhogo!2026xyz"))
        login = jpost(
            self.client, "/api/auth/login", {"username": "org", "password": "Korhogo!2026xyz"}
        )
        self.assertEqual(login.status_code, 200)

    def test_confirmation_revoque_les_anciens_tokens(self):
        ancien = bearer(self.org)
        token = self._generate_link()
        jpost(
            self.client,
            "/api/auth/reset-password-confirm",
            {"token": token, "nouveau_mot_de_passe": "Korhogo!2026xyz"},
        )
        self.assertEqual(self.client.get("/api/auth/me", **ancien).status_code, 401)

    def test_lien_deja_utilise_refuse(self):
        token = self._generate_link()
        jpost(
            self.client,
            "/api/auth/reset-password-confirm",
            {"token": token, "nouveau_mot_de_passe": "Korhogo!2026xyz"},
        )
        r = jpost(
            self.client,
            "/api/auth/reset-password-confirm",
            {"token": token, "nouveau_mot_de_passe": "AutreMotDePasse!123"},
        )
        self.assertEqual(r.status_code, 400)

    @override_settings(JWT_RESET_LIFETIME_MINUTES=-1)
    def test_lien_expire_refuse(self):
        token = self._generate_link()
        r = jpost(
            self.client,
            "/api/auth/reset-password-confirm",
            {"token": token, "nouveau_mot_de_passe": "Korhogo!2026xyz"},
        )
        self.assertEqual(r.status_code, 400)

    def test_mot_de_passe_faible_refuse(self):
        token = self._generate_link()
        r = jpost(
            self.client,
            "/api/auth/reset-password-confirm",
            {"token": token, "nouveau_mot_de_passe": "1234"},
        )
        self.assertEqual(r.status_code, 422)

    def test_token_invalide_refuse(self):
        r = jpost(
            self.client,
            "/api/auth/reset-password-confirm",
            {"token": "n-importe-quoi", "nouveau_mot_de_passe": "Korhogo!2026xyz"},
        )
        self.assertEqual(r.status_code, 400)


class AuditTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_user(
            username="admin", email="a@x.ci", password="password@123", role="admin"
        )
        self.org = User.objects.create_user(
            username="org", email="o@x.ci", password="password@123", role="organisateur"
        )

    def test_connexion_tracee(self):
        jpost(self.client, "/api/auth/login", {"username": "org", "password": "password@123"})
        self.assertTrue(
            AuditLog.objects.filter(action="login", username="org").exists()
        )

    def test_echec_connexion_trace(self):
        jpost(self.client, "/api/auth/login", {"username": "org", "password": "faux"})
        self.assertTrue(
            AuditLog.objects.filter(action="login_failed", username="org").exists()
        )

    def test_journal_admin_seulement(self):
        self.assertEqual(self.client.get("/api/auth/audit", **bearer(self.org)).status_code, 403)
        self.assertEqual(self.client.get("/api/auth/audit", **bearer(self.admin)).status_code, 200)

    def test_audit_par_utilisateur(self):
        # une connexion de org
        jpost(self.client, "/api/auth/login", {"username": "org", "password": "password@123"})
        r = self.client.get(f"/api/auth/users/{self.org.id}/audit", **bearer(self.admin))
        self.assertEqual(r.status_code, 200)
        self.assertTrue(any(e["action"] == "login" for e in r.json()))
        # non-admin interdit
        self.assertEqual(
            self.client.get(f"/api/auth/users/{self.org.id}/audit", **bearer(self.org)).status_code,
            403,
        )

    def test_creation_compte_tracee(self):
        jpost(
            self.client,
            "/api/auth/users",
            {"username": "z", "email": "z@x.ci", "password": "password@123", "role": "organisateur"},
            **bearer(self.admin),
        )
        self.assertTrue(AuditLog.objects.filter(action="user_create", objet="z").exists())
