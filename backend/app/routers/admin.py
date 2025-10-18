from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_admin
from app.db.models import Appointment, AppointmentStatus, Doctor, Patient
from app.db.session import get_db
from app.schemas.admin import (
    AdminDoctorListResponse,
    AdminDoctorSummary,
    AdminStatsResponse,
    CancellationSummary,
    DoctorVerificationRequest,
    DoctorVerificationResponse,
)
from app.services.audit import log_audit_event

router = APIRouter(prefix="/admin", tags=["admin"])


def _doctor_to_summary(doctor: Doctor) -> AdminDoctorSummary:
    clinic_name: Optional[str] = doctor.clinic.name if doctor.clinic else None
    return AdminDoctorSummary(
        id=doctor.user_id,
        email=doctor.user.email,
        first_name=doctor.first_name,
        last_name=doctor.last_name,
        verified=doctor.verified,
        clinic_name=clinic_name,
        city=doctor.city,
        region=doctor.region,
        country=doctor.country,
        created_at=doctor.created_at,
    )


@router.get("/doctors", response_model=AdminDoctorListResponse)
def list_doctors(
    request: Request,
    status_filter: str = Query(
        "pending",
        pattern="^(pending|verified)$",
        alias="status",
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin),
) -> AdminDoctorListResponse:
    is_verified = status_filter == "verified"

    query = (
        db.query(Doctor)
        .options(joinedload(Doctor.user), joinedload(Doctor.clinic))
        .filter(Doctor.verified.is_(is_verified))
    )

    total = query.count()
    offset = (page - 1) * limit
    doctors = query.order_by(Doctor.created_at.desc()).offset(offset).limit(limit).all()

    items = [_doctor_to_summary(doc) for doc in doctors]

    log_audit_event(
        db,
        action="admin.doctors.list",
        resource="doctor",
        request=request,
        user_id=admin.id,
        metadata={
            "status": status_filter,
            "page": page,
            "limit": limit,
            "returned": len(items),
        },
        use_separate_session=True,
    )

    return AdminDoctorListResponse(items=items, total=total, page=page, limit=limit)


@router.post("/doctors/{doctor_id}/verify", response_model=DoctorVerificationResponse)
def verify_doctor(
    doctor_id: int,
    payload: DoctorVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin),
) -> DoctorVerificationResponse:
    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.user), joinedload(Doctor.clinic))
        .filter(Doctor.user_id == doctor_id)
        .first()
    )
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    doctor.verified = payload.verified
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    action = "admin.doctor.verified" if payload.verified else "admin.doctor.unverified"
    log_audit_event(
        db,
        action=action,
        resource="doctor",
        request=request,
        user_id=admin.id,
        metadata={
            "doctor_id": doctor.user_id,
            "verified": doctor.verified,
            "note": payload.note,
        },
        use_separate_session=True,
    )

    summary = _doctor_to_summary(doctor)
    return DoctorVerificationResponse(**summary.model_dump(), note=payload.note)


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    request: Request,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin),
) -> AdminStatsResponse:
    """Get comprehensive statistics for the admin dashboard."""
    
    # Total patients
    total_patients = db.query(func.count(Patient.user_id)).scalar() or 0
    
    # Total doctors
    total_doctors = db.query(func.count(Doctor.user_id)).scalar() or 0
    
    # Verified doctors
    verified_doctors = db.query(func.count(Doctor.user_id)).filter(Doctor.verified.is_(True)).scalar() or 0
    
    # Pending doctors
    pending_doctors = db.query(func.count(Doctor.user_id)).filter(Doctor.verified.is_(False)).scalar() or 0
    
    # Total appointments
    total_appointments = db.query(func.count(Appointment.id)).scalar() or 0
    
    # Cancelled appointments
    cancelled_appointments = db.query(func.count(Appointment.id)).filter(
        Appointment.status == AppointmentStatus.cancelled
    ).scalar() or 0
    
    # Patient cancellations (grouped by patient)
    patient_cancellations = (
        db.query(
            Patient.user_id,
            Patient.first_name,
            Patient.last_name,
            func.count(Appointment.id).label('cancellation_count')
        )
        .join(Appointment, Appointment.patient_id == Patient.user_id)
        .filter(Appointment.status == AppointmentStatus.cancelled)
        .group_by(Patient.user_id, Patient.first_name, Patient.last_name)
        .order_by(func.count(Appointment.id).desc())
        .limit(50)
        .all()
    )
    
    # Doctor cancellations (grouped by doctor) - these are appointments that were cancelled 
    # This counts cancellations of appointments with each doctor
    doctor_cancellations = (
        db.query(
            Doctor.user_id,
            Doctor.first_name,
            Doctor.last_name,
            func.count(Appointment.id).label('cancellation_count')
        )
        .join(Appointment, Appointment.doctor_id == Doctor.user_id)
        .filter(Appointment.status == AppointmentStatus.cancelled)
        .group_by(Doctor.user_id, Doctor.first_name, Doctor.last_name)
        .order_by(func.count(Appointment.id).desc())
        .limit(50)
        .all()
    )
    
    patient_cancellation_list = [
        CancellationSummary(
            id=row.user_id,
            name=f"{row.first_name} {row.last_name}",
            cancellation_count=row.cancellation_count
        )
        for row in patient_cancellations
    ]
    
    doctor_cancellation_list = [
        CancellationSummary(
            id=row.user_id,
            name=f"Dr. {row.first_name} {row.last_name}",
            cancellation_count=row.cancellation_count
        )
        for row in doctor_cancellations
    ]
    
    log_audit_event(
        db,
        action="admin.stats.viewed",
        resource="admin",
        request=request,
        user_id=admin.id,
        metadata={},
        use_separate_session=True,
    )
    
    return AdminStatsResponse(
        total_patients=total_patients,
        total_doctors=total_doctors,
        verified_doctors=verified_doctors,
        pending_doctors=pending_doctors,
        total_appointments=total_appointments,
        cancelled_appointments=cancelled_appointments,
        patient_cancellations=patient_cancellation_list,
        doctor_cancellations=doctor_cancellation_list,
    )

