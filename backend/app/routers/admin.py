from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_admin
from app.db.models import Doctor
from app.db.session import get_db
from app.schemas.admin import (
    AdminDoctorListResponse,
    AdminDoctorSummary,
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
