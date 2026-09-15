import hashlib
import hmac
import secrets
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Activity, AuthSession, Availability, JoinRequest, Message, UserProfile

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GO College API")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(?:localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):(?:8081|8082|19006)$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

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
        "latitude": "REAL",
        "longitude": "REAL",
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
        "email": "VARCHAR COLLATE NOCASE",
        "date_of_birth": "DATE",
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

        connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_user_profiles_email "
            "ON user_profiles(email COLLATE NOCASE)"
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
    latitude: Optional[float] = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180, allow_inf_nan=False)
    category: str
    description: str = ""
    photo_url: str = ""
    creator_code: str = "rojan-txst"
    creator_photo_url: str = ""
    max_people: int = 0
    interested_count: int = 1

    @model_validator(mode="after")
    def validate_coordinates(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must both be provided")
        return self


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    username: str = Field(min_length=2, max_length=40)
    bio: str = ""
    photo_url: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return value.lower()


class RegisterRequest(LoginRequest):
    username: str = Field(min_length=2, max_length=40)
    date_of_birth: date
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def clean_username(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("date_of_birth")
    @classmethod
    def validate_birthday(cls, value):
        if not date(1900, 1, 1) <= value <= date.today():
            raise ValueError("Enter a valid birth date between 1900 and today")
        return value


class JoinRequestCreate(BaseModel):
    activity_id: int
    requester_code: str


class JoinRequestStatusUpdate(BaseModel):
    creator_code: str
    status: str


class MessageCreate(BaseModel):
    sender_code: str
    body: str


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
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600000).hex()
    return f"pbkdf2_sha256$600000${digest}"


def set_profile_password(profile: UserProfile, password: str):
    salt = secrets.token_hex(16)
    profile.password_salt = salt
    profile.password_hash = hash_password(password, salt)


def password_matches(profile: UserProfile, password: str):
    if not profile.password_hash or not profile.password_salt:
        return False

    password_hash = hash_password(password, profile.password_salt)
    return hmac.compare_digest(password_hash, profile.password_hash)


def profile_response(profile: UserProfile, private: bool = False):
    result = {
        "id": profile.id,
        "username": profile.username,
        "user_code": profile.user_code,
        "bio": profile.bio,
        "photo_url": profile.photo_url,
    }
    if private:
        result["email"] = profile.email
        result["date_of_birth"] = profile.date_of_birth.isoformat() if profile.date_of_birth else None
    return result


def start_session(profile: UserProfile, db: Session):
    token = secrets.token_urlsafe(32)
    db.add(AuthSession(
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        user_code=profile.user_code,
        expires_at=datetime.utcnow() + timedelta(days=7),
    ))
    db.commit()
    return {"profile": profile_response(profile, private=True), "token": token}


def current_session(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    scheme, _, token = authorization.partition(" ")
    session = db.get(AuthSession, hashlib.sha256(token.encode()).hexdigest()) if token else None
    if scheme.lower() != "bearer" or not session or session.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=401, detail="Please log in again")
    return session


def current_profile(session: AuthSession = Depends(current_session), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_code == session.user_code).first()
    if not profile:
        raise HTTPException(status_code=401, detail="Please log in again")
    return profile


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


def message_response(message: Message):
    return {
        "id": message.id,
        "join_request_id": message.join_request_id,
        "activity_id": message.activity_id,
        "sender_code": message.sender_code,
        "recipient_code": message.recipient_code,
        "body": message.body,
        "created_at": message.created_at.isoformat() if message.created_at else "",
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
        "latitude": activity.latitude,
        "longitude": activity.longitude,
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


@app.get("/profile/me")
def get_my_profile(profile: UserProfile = Depends(current_profile)):
    return profile_response(profile, private=True)


@app.get("/profile/{user_code}")
def get_profile_by_code(
    user_code: str,
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_code == normalize_user_code(user_code)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return profile_response(profile)


@app.put("/profile")
@app.put("/profile/me")
def update_profile(
    profile_update: ProfileUpdate,
    profile: UserProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    profile.username = profile_update.username
    profile.bio = profile_update.bio
    profile.photo_url = profile_update.photo_url

    db.commit()
    db.refresh(profile)

    return profile_response(profile, private=True)


@app.put("/profile/{user_code}")
def update_profile_by_code(
    user_code: str,
    profile_update: ProfileUpdate,
    profile: UserProfile = Depends(current_profile),
    db: Session = Depends(get_db),
):
    if profile.user_code != normalize_user_code(user_code):
        raise HTTPException(status_code=403, detail="You can only update your own profile")
    return update_profile(profile_update, profile, db)


@app.post("/auth/register")
def register_user(
    auth: RegisterRequest,
    db: Session = Depends(get_db),
):
    profile = UserProfile(
        username=auth.username,
        user_code=f"go-{uuid4().hex}",
        email=auth.email,
        date_of_birth=auth.date_of_birth,
        bio="",
        photo_url="",
    )
    set_profile_password(profile, auth.password)
    db.add(profile)
    try:
        db.flush()
        return start_session(profile, db)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account already uses this email. Log in instead.")


@app.post("/auth/login")
def login_user(
    auth: LoginRequest,
    db: Session = Depends(get_db),
):
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.email == auth.email)
        .first()
    )

    if not profile or not password_matches(profile, auth.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return start_session(profile, db)


@app.post("/auth/logout")
def logout_user(session: AuthSession = Depends(current_session), db: Session = Depends(get_db)):
    db.delete(session)
    db.commit()
    return {"logged_out": True}


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
        latitude=activity.latitude,
        longitude=activity.longitude,
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


@app.delete("/activities/{activity_id}")
def delete_activity(
    activity_id: int,
    creator_code: str,
    db: Session = Depends(get_db),
):
    clean_creator_code = normalize_user_code(creator_code)
    activity = get_activity_or_404(db, activity_id)

    if activity.creator_code != clean_creator_code:
        raise HTTPException(status_code=403, detail="Only the post creator can delete this post")

    db.query(JoinRequest).filter(JoinRequest.activity_id == activity.id).delete()
    db.query(Message).filter(Message.activity_id == activity.id).delete()
    db.delete(activity)
    db.commit()

    return {"deleted": True, "activity_id": activity_id}


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


@app.delete("/join-requests/{request_id}")
def cancel_join_request(
    request_id: int,
    requester_code: str,
    db: Session = Depends(get_db),
):
    clean_requester_code = normalize_user_code(requester_code)
    record = db.query(JoinRequest).filter(JoinRequest.id == request_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Join request not found")

    if record.requester_code != clean_requester_code:
        raise HTTPException(status_code=403, detail="Only the requester can cancel this request")

    if record.status == "accepted":
        raise HTTPException(status_code=400, detail="Accepted requests cannot be cancelled")

    db.delete(record)
    db.commit()

    return {"deleted": True, "request_id": request_id}


def get_accepted_request(db: Session, request_id: int):
    record = db.query(JoinRequest).filter(JoinRequest.id == request_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Join request not found")

    if record.status != "accepted":
        raise HTTPException(status_code=403, detail="Chat opens after the request is accepted")

    activity = get_activity_or_404(db, record.activity_id)
    return record, activity


def ensure_message_member(request: JoinRequest, user_code: str):
    clean_code = normalize_user_code(user_code)

    if clean_code not in {request.creator_code, request.requester_code}:
        raise HTTPException(status_code=403, detail="You are not part of this chat")

    return clean_code


@app.get("/join-requests/{request_id}/messages")
def get_messages(
    request_id: int,
    user_code: str,
    db: Session = Depends(get_db),
):
    request, _ = get_accepted_request(db, request_id)
    ensure_message_member(request, user_code)

    records = (
        db.query(Message)
        .filter(Message.join_request_id == request.id)
        .order_by(Message.created_at, Message.id)
        .all()
    )

    return [message_response(record) for record in records]


@app.post("/join-requests/{request_id}/messages")
def create_message(
    request_id: int,
    message: MessageCreate,
    db: Session = Depends(get_db),
):
    request, _ = get_accepted_request(db, request_id)
    sender_code = ensure_message_member(request, message.sender_code)
    body = message.body.strip()

    if not body:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if len(body) > 1000:
        raise HTTPException(status_code=400, detail="Message is too long")

    recipient_code = (
        request.requester_code
        if sender_code == request.creator_code
        else request.creator_code
    )
    record = Message(
        join_request_id=request.id,
        activity_id=request.activity_id,
        sender_code=sender_code,
        recipient_code=recipient_code,
        body=body,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return message_response(record)
