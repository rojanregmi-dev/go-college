from fastapi import Depends, FastAPI
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Activity, Availability, UserProfile

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GO College API")


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


def seed_default_profile(db: Session):
    existing_profile = db.query(UserProfile).first()

    if existing_profile:
        return existing_profile

    profile = UserProfile(
        username="Rojan",
        user_code="rojan-txst",
        bio="Down for study sessions, gym runs, and quick campus plans.",
        photo_url="",
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile


def seed_demo_activities(db: Session):
    existing_activity = db.query(Activity).first()

    if existing_activity:
        return

    activities = [
        Activity(
            title="Basketball at 6 PM",
            group_name="Basketball Runs",
            period="Tonight",
            location="Student Rec Center",
            category="Sports",
            interested_count=4,
        ),
        Activity(
            title="Calc Study",
            group_name="CS Study Group",
            period="Tonight",
            location="Alkek Library",
            category="Study",
            interested_count=3,
        ),
        Activity(
            title="Coffee after class",
            group_name="Foodies",
            period="Now",
            location="LBJ Student Center",
            category="Food",
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


@app.get("/health")
def health_check():
    return {"status": "ok"}


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
    record = Activity(
        title=activity.title,
        group_name=activity.group_name,
        period=activity.period,
        location=activity.location,
        category=activity.category,
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
            "interested_count": record.interested_count,
        }
        for record in records
    ]
