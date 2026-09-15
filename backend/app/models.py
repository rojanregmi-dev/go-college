from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String

from .database import Base


class Availability(Base):
    __tablename__ = "availability"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=False)
    period = Column(String, nullable=False)
    is_available = Column(Boolean, default=True)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    group_name = Column(String, nullable=False)
    period = Column(String, nullable=False)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    category = Column(String, nullable=False)
    description = Column(String, default="")
    photo_url = Column(String, default="")
    creator_code = Column(String, default="")
    creator_photo_url = Column(String, default="")
    max_people = Column(Integer, default=0)
    interested_count = Column(Integer, default=0)



class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    user_code = Column(String, nullable=False, unique=True)
    email = Column(String(collation="NOCASE"), nullable=True, unique=True)
    date_of_birth = Column(Date, nullable=True)
    bio = Column(String, default="")
    photo_url = Column(String, default="")
    password_hash = Column(String, default="")
    password_salt = Column(String, default="")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    token_hash = Column(String, primary_key=True)
    user_code = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)


class JoinRequest(Base):
    __tablename__ = "join_requests"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, nullable=False, index=True)
    requester_code = Column(String, nullable=False, index=True)
    requester_name = Column(String, nullable=False)
    requester_photo_url = Column(String, default="")
    creator_code = Column(String, nullable=False, index=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    join_request_id = Column(Integer, nullable=False, index=True)
    activity_id = Column(Integer, nullable=False, index=True)
    sender_code = Column(String, nullable=False, index=True)
    recipient_code = Column(String, nullable=False, index=True)
    body = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
