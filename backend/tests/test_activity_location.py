import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import patch

from pydantic import ValidationError
from sqlalchemy import create_engine, inspect

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class ActivityLocationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Import the app in a temporary directory so its DB and uploads stay isolated.
        previous_directory = Path.cwd()
        temporary = tempfile.TemporaryDirectory()
        cls.addClassCleanup(temporary.cleanup)
        cls.addClassCleanup(os.chdir, previous_directory)
        os.chdir(temporary.name)
        with sqlite3.connect("go_college.db") as db:
            db.execute("""CREATE TABLE activities (
                id INTEGER PRIMARY KEY, title VARCHAR, group_name VARCHAR,
                period VARCHAR, location VARCHAR, category VARCHAR,
                interested_count INTEGER DEFAULT 0
            )""")
            db.execute("""INSERT INTO activities VALUES
                (1, 'Existing plan', 'Host', 'Today', 'Library', 'Meet', 0)""")
        from app import main
        cls.api = main
        cls.addClassCleanup(main.engine.dispose)

    def activity(self, **coordinates):
        return self.api.ActivityCreate(
            title="Location test", group_name="Test host", period="Today",
            location="Meeting place", category="Meet", creator_code="location-test",
            **coordinates,
        )

    def test_migration_preserves_existing_post(self):
        self.api.ensure_activity_columns()
        self.api.ensure_activity_columns()
        with self.api.SessionLocal() as db:
            existing = db.get(self.api.Activity, 1)
            self.assertEqual(existing.title, "Existing plan")
            self.assertIsNone(existing.latitude)
            self.assertIsNone(existing.longitude)

    def test_fresh_database_has_coordinate_columns(self):
        fresh_engine = create_engine("sqlite://")
        try:
            self.api.Base.metadata.create_all(fresh_engine)
            with patch.object(self.api, "engine", fresh_engine):
                self.api.ensure_activity_columns()
            columns = {column["name"] for column in inspect(fresh_engine).get_columns("activities")}
            self.assertTrue({"latitude", "longitude"}.issubset(columns))
        finally:
            fresh_engine.dispose()

    def test_coordinates_survive_create_and_feed_reload(self):
        for latitude, longitude in [(29.89, -97.94), (0, 0)]:
            with self.api.SessionLocal() as db:
                result = self.api.create_activity(self.activity(latitude=latitude, longitude=longitude), db)
            with self.api.SessionLocal() as db:
                post = next(post for post in self.api.get_activities(db) if post["id"] == result["id"])
                self.assertEqual((post["latitude"], post["longitude"]), (latitude, longitude))

    def test_invalid_or_partial_coordinates_are_rejected(self):
        for coordinates in [
            {"latitude": 30}, {"longitude": -98},
            {"latitude": 91, "longitude": 0}, {"latitude": 0, "longitude": -181},
            {"latitude": float("nan"), "longitude": 0},
            {"latitude": 0, "longitude": float("inf")},
        ]:
            with self.subTest(coordinates=coordinates), self.assertRaises(ValidationError):
                self.activity(**coordinates)


if __name__ == "__main__":
    unittest.main()
