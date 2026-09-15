# GO College

GO College is a Shipaton 2026 mobile app prototype for discovering and coordinating campus plans.

The app connects:

- when students are free
- what is happening around them
- who is hosting or posting a meet/activity
- where people can coordinate next

## Stack

Frontend:

- Expo SDK 57
- React Native
- TypeScript
- Expo Router

Backend:

- FastAPI
- SQLAlchemy
- SQLite

## Project Structure

```text
src/                  Expo React Native app
src/app/(tabs)/       Main tab screens
src/services/api.ts   Frontend API helpers

backend/app/          FastAPI backend code
backend/app/main.py   API routes
backend/app/models.py SQLAlchemy database models
backend/app/database.py SQLite connection
```

## Frontend Setup

Install frontend dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start
```

Use Expo Go on a phone and scan the QR code.

## Backend Setup

Create and activate a Python virtual environment:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The `--host 0.0.0.0` part matters because the phone needs to reach the backend over WiFi.

## Database

The SQLite database file is local and is not committed to Git:

```text
backend/go_college.db
```

When the backend starts, SQLAlchemy creates missing tables from the models:

```python
Base.metadata.create_all(bind=engine)
```

That means a fresh clone can create its own local database by running the backend.

Current prototype data is seeded by backend helper functions when routes are used:

- activities are seeded by `GET /activities`
- default profile is seeded by `GET /profile`

Do not commit `.db`, `.venv`, `__pycache__`, or `.pyc` files.

## Running The App Locally

Use two terminals.

Terminal 1, backend:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2, frontend:

```bash
npx expo start
```

The frontend API base URL follows the Expo host IP automatically, so changing WiFi networks should not require editing code as long as the phone and Mac are on the same network.

## Quick Backend Checks

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/activities
curl http://127.0.0.1:8000/profile
```

Expected:

- `/health` returns `{"status":"ok"}`
- `/activities` returns feed activities
- `/profile` returns the default or saved profile

## Current Demo Flow

1. Open Home to discover meets and activities.
2. Open Post to create a meet or activity.
3. Open an activity card to see details.
4. Open Messages for activity chat placeholders.
5. Open Community to create groups.
6. Open Profile to edit username, ID display, bio, and photo placeholder.

## Location Radius

New posts use a confirmed meeting location: select **Use my location**, or enter
an address with its city and state, search, and select the matching result.
The backend stores latitude and longitude alongside the place name. Existing
databases receive the two nullable columns automatically on backend restart.

In Discover, enable the nearby switch or tap the location icon. The radius starts
at 10 miles and accepts values from 0.1 to 500. Distances are straight-line miles,
not driving distances. Turn the switch off for **Any distance**. Older posts
without coordinates only appear with that option; new posts with zero spots
remaining stay hidden regardless of distance.

Address search uses the native iOS/Android geocoder through `expo-location` and
works in Expo Go. Web supports current location on localhost or HTTPS, but not
native address search. Location is requested when you tap the control; there is
no background tracking. The viewer's position stays on their device for filtering.
After moving, tap the location icon again to update the search center.

Restart Expo after installing the dependency with `npm install`:

```bash
npx expo start -c
```

Focused checks from the repository root (Node 24 for the TypeScript test import):

```bash
backend/.venv/bin/python backend/tests/test_activity_location.py
node --test tests/location.test.cjs
```

The backend checks use a temporary database and do not change your demo data.

## Notes

This is a hackathon prototype. The current local setup uses SQLite and automatic table creation. A production version would use PostgreSQL, migrations, real authentication, persistent image storage, and real-time messaging.
