from datetime import datetime, timedelta
import hashlib
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class EmailAuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        previous_directory = Path.cwd()
        temporary = tempfile.TemporaryDirectory()
        cls.addClassCleanup(temporary.cleanup)
        cls.addClassCleanup(os.chdir, previous_directory)
        os.chdir(temporary.name)
        with sqlite3.connect("go_college.db") as db:
            db.execute("""CREATE TABLE user_profiles (
                id INTEGER PRIMARY KEY, username VARCHAR, user_code VARCHAR UNIQUE,
                bio VARCHAR, photo_url VARCHAR, password_hash VARCHAR, password_salt VARCHAR
            )""")
            db.execute("INSERT INTO user_profiles VALUES (1, 'Legacy', 'legacy-demo', '', '', '', '')")
        from app import main
        cls.api = main
        cls.client = TestClient(main.app)
        cls.addClassCleanup(main.engine.dispose)
        cls.addClassCleanup(cls.client.close)

    def setUp(self):
        with self.api.SessionLocal() as db:
            db.query(self.api.AuthSession).delete()
            db.query(self.api.UserProfile).filter(self.api.UserProfile.id != 1).delete()
            db.commit()

    def register(self, email="person@example.com", **changes):
        payload = {"email": email, "username": "New Person", "date_of_birth": "2001-04-20", "password": "demo-password"}
        payload.update(changes)
        return self.client.post("/auth/register", json=payload)

    def headers(self, account):
        return {"Authorization": "Bearer " + account["token"]}

    def test_registration_persists_private_fields_and_hashes(self):
        response = self.register("PERSON@EXAMPLE.COM")
        self.assertEqual(response.status_code, 200)
        account = response.json()
        profile = account["profile"]
        self.assertEqual(profile["email"], "person@example.com")
        self.assertEqual(profile["date_of_birth"], "2001-04-20")
        self.assertNotIn("@", profile["user_code"])
        with self.api.SessionLocal() as db:
            stored = db.get(self.api.UserProfile, profile["id"])
            self.assertTrue(stored.password_hash.startswith("pbkdf2_sha256$600000$"))
            self.assertNotIn("demo-password", stored.password_hash)
            self.assertIsNone(db.get(self.api.AuthSession, account["token"]))
            digest = hashlib.sha256(account["token"].encode()).hexdigest()
            self.assertIsNotNone(db.get(self.api.AuthSession, digest))
        loaded = self.client.get("/profile/me", headers=self.headers(account)).json()
        self.assertEqual(loaded, profile)

    def test_email_login_preserves_password_whitespace(self):
        account = self.register(password=" password with spaces ").json()
        response = self.client.post("/auth/login", json={"email": "PERSON@EXAMPLE.COM", "password": " password with spaces "})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["profile"]["id"], account["profile"]["id"])
        wrong = self.client.post("/auth/login", json={"email": "person@example.com", "password": "password with spaces"})
        self.assertEqual(wrong.status_code, 401)

    def test_duplicate_email_and_invalid_signup_are_rejected(self):
        self.assertEqual(self.register().status_code, 200)
        self.assertEqual(self.register("PERSON@EXAMPLE.COM").status_code, 409)
        for fields in [
            {"email": "not-an-email"}, {"username": " "}, {"password": "short"},
            {"date_of_birth": "2999-01-01"}, {"date_of_birth": "2001-02-30"},
            {"date_of_birth": "1899-12-31"},
        ]:
            with self.subTest(fields=fields):
                self.assertEqual(self.register(**fields).status_code, 422)

    def test_public_profiles_do_not_expose_account_details(self):
        account = self.register().json()
        for path in ["/profile", "/profile/" + account["profile"]["user_code"]]:
            public = self.client.get(path).json()
            for field in ["email", "date_of_birth", "password_hash", "password_salt", "token"]:
                self.assertNotIn(field, public)

    def test_private_profile_requires_unexpired_session(self):
        account = self.register().json()
        self.assertEqual(self.client.get("/profile/me").status_code, 401)
        self.assertEqual(self.client.get("/profile/me", headers={"Authorization": "Bearer invalid"}).status_code, 401)
        with self.api.SessionLocal() as db:
            session = db.query(self.api.AuthSession).first()
            session.expires_at = datetime.utcnow() - timedelta(seconds=1)
            db.commit()
        self.assertEqual(self.client.get("/profile/me", headers=self.headers(account)).status_code, 401)

    def test_profile_updates_are_bound_to_logged_in_account(self):
        first = self.register().json()
        second = self.register("second@example.com").json()
        updates = {"username": "Edited name", "bio": "Hello", "photo_url": ""}
        denied = self.client.put("/profile/" + second["profile"]["user_code"], json=updates, headers=self.headers(first))
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(self.client.put("/profile/me", json=updates).status_code, 401)
        saved = self.client.put("/profile/me", json=updates, headers=self.headers(first))
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["email"], "person@example.com")
        self.assertEqual(saved.json()["date_of_birth"], "2001-04-20")
        self.assertEqual(saved.json()["username"], "Edited name")
        self.assertEqual(self.client.put("/profile/me", json={**updates, "email": "changed@example.com"}, headers=self.headers(first)).status_code, 422)

    def test_logout_revokes_only_that_session(self):
        first = self.register().json()
        second = self.register("second@example.com").json()
        self.assertEqual(self.client.post("/auth/logout", headers=self.headers(first)).status_code, 200)
        self.assertEqual(self.client.get("/profile/me", headers=self.headers(first)).status_code, 401)
        response = self.client.get("/profile/me", headers=self.headers(second))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "second@example.com")

    def test_migration_keeps_old_demo_profiles(self):
        self.api.ensure_user_profile_columns()
        self.api.ensure_user_profile_columns()
        with self.api.SessionLocal() as db:
            legacy = db.get(self.api.UserProfile, 1)
            self.assertEqual(legacy.user_code, "legacy-demo")
            self.assertIsNone(legacy.email)
            self.assertIsNone(legacy.date_of_birth)


if __name__ == "__main__":
    unittest.main()
