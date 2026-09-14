from fastapi import Depends, FastAPI
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Availability

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GO College API")


class AvailabilityCreate(BaseModel):
    user_name: str
    period: str
    is_available: bool = True


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "GO College backend is running"}


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
