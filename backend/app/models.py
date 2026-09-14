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
    interested_count = Column(Integer, default=0)
