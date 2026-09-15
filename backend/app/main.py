import hashlib
import hmac
import secrets
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Activity, Availability, JoinRequest, UserProfile

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


def ensure_user_profile_columns():
    required_columns = {
        "password_hash": "VARCHAR DEFAULT ''",
        "password_salt": "VARCHAR DEFAULT ''",
    }

    with engine.begin() as connection:
        existing_columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(user_profiles)")
        }

        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE user_profiles ADD COLUMN {column_name} {column_type}"
                )


ensure_user_profile_columns()


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


class AuthRequest(BaseModel):
    user_id: str
    password: str
    username: str = ""


class JoinRequestCreate(BaseModel):
    activity_id: int
    requester_code: str


class JoinRequestStatusUpdate(BaseModel):
    creator_code: str
    status: str


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


def hash_password(password: str, salt: str):
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def set_profile_password(profile: UserProfile, password: str):
    salt = secrets.token_hex(16)
    profile.password_salt = salt
    profile.password_hash = hash_password(password, salt)


def password_matches(profile: UserProfile, password: str):
    if not profile.password_hash or not profile.password_salt:
        return False

    password_hash = hash_password(password, profile.password_salt)
    return hmac.compare_digest(password_hash, profile.password_hash)


def profile_response(profile: UserProfile):
    return {
        "id": profile.id,
        "username": profile.username,
        "user_code": profile.user_code,
        "bio": profile.bio,
        "photo_url": profile.photo_url,
    }


def join_request_response(request: JoinRequest, activity: Activity):
    return {
        "id": request.id,
        "activity_id": request.activity_id,
        "activity_title": activity.title,
        "activity_category": activity.category,
        "activity_period": activity.period,
        "activity_location": activity.location,
        "requester_code": request.requester_code,
        "requester_name": request.requester_name,
        "requester_photo_url": request.requester_photo_url,
        "creator_code": request.creator_code,
        "status": request.status,
        "created_at": request.created_at.isoformat() if request.created_at else "",
    }


def get_activity_or_404(db: Session, activity_id: int):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    return activity


def count_accepted_requests(db: Session, activity_id: int):
    return (
        db.query(JoinRequest)
        .filter(
            JoinRequest.activity_id == activity_id,
            JoinRequest.status == "accepted",
        )
        .count()
    )


def has_capacity(db: Session, activity: Activity):
    if not activity.max_people:
        return True

    accepted_count = count_accepted_requests(db, activity.id)
    return accepted_count < activity.max_people


def activity_response(activity: Activity, db: Session):
    accepted_count = count_accepted_requests(db, activity.id)
    spots_left = None

    if activity.max_people:
        spots_left = max(activity.max_people - accepted_count, 0)

    return {
        "id": activity.id,
        "title": activity.title,
        "group_name": activity.group_name,
        "period": activity.period,
        "location": activity.location,
        "category": activity.category,
        "description": activity.description,
        "photo_url": activity.photo_url,
        "creator_code": activity.creator_code,
        "creator_photo_url": activity.creator_photo_url,
        "max_people": activity.max_people,
        "accepted_count": accepted_count,
        "spots_left": spots_left,
        "interested_count": activity.interested_count,
    }


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

    return profile_response(profile)


@app.get("/profile/{user_code}")
def get_profile_by_code(
    user_code: str,
    db: Session = Depends(get_db),
):
    profile = seed_profile(db, user_code)

    return profile_response(profile)


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

    return profile_response(profile)


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

    return profile_response(profile)


@app.post("/auth/register")
def register_user(
    auth: AuthRequest,
    db: Session = Depends(get_db),
):
    user_code = normalize_user_code(auth.user_id)
    password = auth.password.strip()

    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_code == user_code)
        .first()
    )

    if profile and profile.password_hash:
        raise HTTPException(status_code=400, detail="User ID already exists")

    if not profile:
        profile = seed_profile(db, user_code)

    username = auth.username.strip() or profile.username
    profile.username = username
    set_profile_password(profile, password)

    db.commit()
    db.refresh(profile)

    return profile_response(profile)


@app.post("/auth/login")
def login_user(
    auth: AuthRequest,
    db: Session = Depends(get_db),
):
    user_code = normalize_user_code(auth.user_id)
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_code == user_code)
        .first()
    )

    if not profile or not password_matches(profile, auth.password):
        raise HTTPException(status_code=401, detail="Invalid User ID or password")

    return profile_response(profile)


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

    return activity_response(record, db)


@app.get("/activities")
def get_activities(db: Session = Depends(get_db)):
    seed_demo_activities(db)

    records = db.query(Activity).all()

    return [activity_response(record, db) for record in records]


@app.post("/join-requests")
def create_join_request(
    join_request: JoinRequestCreate,
    db: Session = Depends(get_db),
):
    activity = get_activity_or_404(db, join_request.activity_id)
    requester = seed_profile(db, join_request.requester_code)

    if requester.user_code == activity.creator_code:
        raise HTTPException(status_code=400, detail="You cannot request your own post")

    existing_request = (
        db.query(JoinRequest)
        .filter(
            JoinRequest.activity_id == activity.id,
            JoinRequest.requester_code == requester.user_code,
        )
        .first()
    )

    if existing_request:
        if existing_request.status == "denied":
            existing_request.status = "pending"
            db.commit()
            db.refresh(existing_request)

        return join_request_response(existing_request, activity)

    record = JoinRequest(
        activity_id=activity.id,
        requester_code=requester.user_code,
        requester_name=requester.username,
        requester_photo_url=requester.photo_url,
        creator_code=activity.creator_code,
        status="pending",
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return join_request_response(record, activity)


@app.get("/join-requests/incoming/{creator_code}")
def get_incoming_join_requests(
    creator_code: str,
    db: Session = Depends(get_db),
):
    clean_code = normalize_user_code(creator_code)
    records = (
        db.query(JoinRequest)
        .filter(JoinRequest.creator_code == clean_code)
        .all()
    )

    return [
        join_request_response(record, get_activity_or_404(db, record.activity_id))
        for record in records
    ]


@app.get("/join-requests/outgoing/{requester_code}")
def get_outgoing_join_requests(
    requester_code: str,
    db: Session = Depends(get_db),
):
    clean_code = normalize_user_code(requester_code)
    records = (
        db.query(JoinRequest)
        .filter(JoinRequest.requester_code == clean_code)
        .all()
    )

    return [
        join_request_response(record, get_activity_or_404(db, record.activity_id))
        for record in records
    ]


@app.put("/join-requests/{request_id}/status")
def update_join_request_status(
    request_id: int,
    status_update: JoinRequestStatusUpdate,
    db: Session = Depends(get_db),
):
    clean_creator_code = normalize_user_code(status_update.creator_code)
    next_status = status_update.status.strip().lower()

    if next_status not in {"accepted", "denied"}:
        raise HTTPException(status_code=400, detail="Status must be accepted or denied")

    record = db.query(JoinRequest).filter(JoinRequest.id == request_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Join request not found")

    activity = get_activity_or_404(db, record.activity_id)

    if record.creator_code != clean_creator_code:
        raise HTTPException(status_code=403, detail="Only the post creator can update this request")

    if next_status == "accepted" and record.status != "accepted" and not has_capacity(db, activity):
        raise HTTPException(status_code=400, detail="This post is already full")

    record.status = next_status
    db.commit()
    db.refresh(record)

    return join_request_response(record, activity)
