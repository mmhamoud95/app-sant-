from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.db.models import Patient, Doctor, Appointment, Specialty
from app.auth.dependencies import get_current_admin

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/overview")
def get_stats_overview(db: Session = Depends(get_db)):
    total_patients = db.query(func.count(Patient.user_id)).scalar() or 0
    total_doctors = db.query(func.count(Doctor.user_id)).scalar() or 0
    total_appointments = db.query(func.count(Appointment.id)).scalar() or 0
    verified_doctors = db.query(func.count(Doctor.user_id)).filter(Doctor.verified.is_(True)).scalar() or 0
    return {
        "totalPatients": total_patients,
        "totalDoctors": total_doctors,
        "totalAppointments": total_appointments,
        "verifiedDoctors": verified_doctors,
    }

@router.get("/doctors-by-specialty")
def get_doctors_by_specialty(db: Session = Depends(get_db)):
    results = (
        db.query(Specialty.id.label("specialty_id"), Specialty.name, func.count(Doctor.user_id).label("count"))
        .join(Specialty.doctors)
        .group_by(Specialty.id, Specialty.name)
        .order_by(func.count(Doctor.user_id).desc())
        .all()
    )
    return [dict(row._mapping) for row in results]

@router.get("/patient-feedback")
def get_patient_feedback():
    # Dummy data for now, replace with real aggregation
    return {
        "satisfactionRate": 92.5,
        "averageRating": 4.7,
        "totalReviews": 128,
        "recent": [
            {"id": "1", "patient": "Alice", "city": "Paris", "comment": "Très satisfait!", "rating": 5},
            {"id": "2", "patient": "Bob", "city": "Lyon", "comment": "Bon service.", "rating": 4.5},
        ],
    }
