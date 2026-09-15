from sqlalchemy import Boolean, Column, Integer, String

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
    bio = Column(String, default="")
    photo_url = Column(String, default="")
