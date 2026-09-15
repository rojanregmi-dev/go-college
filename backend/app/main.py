from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, UploadFile
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Activity, Availability, UserProfile

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GO College API")

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def ensure_activity_columns():
    required_columns = {
        "description": "VARCHAR DEFAULT ''",
        "photo_url": "VARCHAR DEFAULT ''",
        "creator_code": "VARCHAR DEFAULT ''",
        "creator_photo_url": "VARCHAR DEFAULT ''",
        "max_people": "INTEGER DEFAULT 0",
    }

    with engine.begin() as connection:
        existing_columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(activities)")
        }

        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE activities ADD COLUMN {column_name} {column_type}"
                )


ensure_activity_columns()


class AvailabilityCreate(BaseModel):
    user_name: str
    period: str
    is_available: bool = True


class ActivityCreate(BaseModel):
    title: str
    group_name: str
    period: str
    location: str
    category: str
    description: str = ""
    photo_url: str = ""
    creator_code: str = "rojan-txst"
    creator_photo_url: str = ""
    max_people: int = 0
    interested_count: int = 1


class ProfileUpdate(BaseModel):
    username: str
    bio: str = ""
    photo_url: str = ""


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def normalize_user_code(user_code: str):
    clean_code = user_code.strip().lower()

    if clean_code:
        return clean_code

    return "rojan-txst"


def seed_profile(db: Session, user_code: str = "rojan-txst"):
    clean_code = normalize_user_code(user_code)
    existing_profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_code == clean_code)
        .first()
    )

    if existing_profile:
        return existing_profile

    username = clean_code.split("-")[0].replace(".", " ").title() or "Student"

    profile = UserProfile(
        username=username,
        user_code=clean_code,
        bio="Down for study sessions, quick campus plans, and meeting people.",
        photo_url="",
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile


def seed_default_profile(db: Session):
    return seed_profile(db, "rojan-txst")


def seed_demo_activities(db: Session):
    existing_activity = db.query(Activity).first()

    if existing_activity:
        demo_updates = {
            "Basketball at 6 PM": {
                "group_name": "Basketball Runs",
                "category": "Activity",
                "description": "Pickup basketball run at the rec. Bring shoes and water.",
                "creator_code": "demo-campus",
                "max_people": 8,
            },
            "Calc Study": {
                "group_name": "Alex",
                "category": "Meet",
                "description": "Looking for a study partner for calc review.",
                "creator_code": "alex-txst",
                "max_people": 2,
            },
            "Coffee after class": {
                "group_name": "Maya",
                "category": "Meet",
                "description": "Quick coffee and conversation between classes.",
                "creator_code": "maya-txst",
                "max_people": 2,
            },
        }

        for title, values in demo_updates.items():
            record = db.query(Activity).filter(Activity.title == title).first()

            if record:
                record.group_name = values["group_name"]
                record.category = values["category"]
                record.description = values["description"]
                record.creator_code = values["creator_code"]
                record.max_people = values["max_people"]

        db.commit()

        return

    activities = [
        Activity(
            title="Basketball at 6 PM",
            group_name="Basketball Runs",
            period="Tonight",
            location="Student Rec Center",
            category="Activity",
            description="Pickup basketball run at the rec. Bring shoes and water.",
            creator_code="demo-campus",
            max_people=8,
            interested_count=4,
        ),
        Activity(
            title="Calc Study",
            group_name="Alex",
            period="Tonight",
            location="Alkek Library",
            category="Meet",
            description="Looking for a study partner for calc review.",
            creator_code="alex-txst",
            max_people=2,
            interested_count=3,
        ),
        Activity(
            title="Coffee after class",
            group_name="Maya",
            period="Now",
            location="LBJ Student Center",
            category="Meet",
            description="Quick coffee and conversation between classes.",
            creator_code="maya-txst",
            max_people=2,
            interested_count=2,
        ),
    ]

    db.add_all(activities)
    db.commit()


@app.get("/")
def root():
    return {"message": "GO College backend is running"}


@app.get("/profile")
def get_profile(db: Session = Depends(get_db)):
    profile = seed_default_profile(db)

    return {
        "id": profile.id,
        "username": profile.username,
        "user_code": profile.user_code,
        "bio": profile.bio,
        "photo_url": profile.photo_url,
    }


@app.get("/profile/{user_code}")
def get_profile_by_code(
    user_code: str,
    db: Session = Depends(get_db),
):
    profile = seed_profile(db, user_code)

    return {
        "id": profile.id,
        "username": profile.username,
        "user_code": profile.user_code,
        "bio": profile.bio,
        "photo_url": profile.photo_url,
    }


@app.put("/profile")
def update_profile(
    profile_update: ProfileUpdate,
    db: Session = Depends(get_db),
):
    profile = seed_default_profile(db)

    profile.username = profile_update.username
    profile.bio = profile_update.bio
    profile.photo_url = profile_update.photo_url

    db.commit()
    db.refresh(profile)

    return {
        "id": profile.id,
        "username": profile.username,
        "user_code": profile.user_code,
        "bio": profile.bio,
        "photo_url": profile.photo_url,
    }


@app.put("/profile/{user_code}")
def update_profile_by_code(
    user_code: str,
    profile_update: ProfileUpdate,
    db: Session = Depends(get_db),
):
    profile = seed_profile(db, user_code)

    profile.username = profile_update.username
    profile.bio = profile_update.bio
    profile.photo_url = profile_update.photo_url

    db.commit()
    db.refresh(profile)

    return {
        "id": profile.id,
        "username": profile.username,
        "user_code": profile.user_code,
        "bio": profile.bio,
        "photo_url": profile.photo_url,
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/uploads")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form("misc"),
):
    allowed_folders = {"profiles", "activities", "misc"}
    upload_folder = folder if folder in allowed_folders else "misc"

    original_name = file.filename or "upload"
    extension = Path(original_name).suffix or ".jpg"
    safe_filename = f"{uuid4().hex}{extension}"
    upload_path = UPLOAD_DIR / upload_folder / safe_filename

    upload_path.parent.mkdir(parents=True, exist_ok=True)

    contents = await file.read()
    upload_path.write_bytes(contents)

    return {"url": f"/uploads/{upload_folder}/{safe_filename}"}


@app.post("/availability")
def create_availability(
    availability: AvailabilityCreate,
    db: Session = Depends(get_db),
):
    record = Availability(
        user_name=availability.user_name,
        period=availability.period,
        is_available=availability.is_available,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "user_name": record.user_name,
        "period": record.period,
        "is_available": record.is_available,
    }


@app.get("/availability")
def get_availability(db: Session = Depends(get_db)):
    records = db.query(Availability).all()

    return [
        {
            "id": record.id,
            "user_name": record.user_name,
            "period": record.period,
            "is_available": record.is_available,
        }
        for record in records
    ]



@app.post("/activities")
def create_activity(
    activity: ActivityCreate,
    db: Session = Depends(get_db),
):
    profile = seed_profile(db, activity.creator_code)

    record = Activity(
        title=activity.title,
        group_name=activity.group_name,
        period=activity.period,
        location=activity.location,
        category=activity.category,
        description=activity.description,
        photo_url=activity.photo_url,
        creator_code=profile.user_code,
        creator_photo_url=activity.creator_photo_url or profile.photo_url,
        max_people=activity.max_people,
        interested_count=activity.interested_count,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "title": record.title,
        "group_name": record.group_name,
        "period": record.period,
        "location": record.location,
        "category": record.category,
        "description": record.description,
        "photo_url": record.photo_url,
        "creator_code": record.creator_code,
        "creator_photo_url": record.creator_photo_url,
        "max_people": record.max_people,
        "interested_count": record.interested_count,
    }


@app.get("/activities")
def get_activities(db: Session = Depends(get_db)):
    seed_demo_activities(db)

    records = db.query(Activity).all()

    return [
        {
            "id": record.id,
            "title": record.title,
            "group_name": record.group_name,
            "period": record.period,
            "location": record.location,
            "category": record.category,
            "description": record.description,
            "photo_url": record.photo_url,
            "creator_code": record.creator_code,
            "creator_photo_url": record.creator_photo_url,
            "max_people": record.max_people,
            "interested_count": record.interested_count,
        }
        for record in records
    ]
