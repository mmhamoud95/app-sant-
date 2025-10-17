from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_patient
from app.db.models import Appointment, AppointmentStatus, Doctor, Language, Patient, Slot
from app.db.session import get_db
from app.schemas.appointments import (
    AppointmentCancelRequest,
    AppointmentCreateRequest,
    AppointmentListResponse,
    AppointmentResponse,
    AppointmentRescheduleRequest,
    AppointmentDoctorSummary,
    AppointmentSlotResponse,
)
from app.schemas.patient import PatientProfileResponse, PatientProfileUpdate
from app.services.appointments import (
    book_appointment,
    cancel_appointment,
    reschedule_appointment,
)
from app.services.audit import log_audit_event

router = APIRouter(prefix="/patients", tags=["patients"])


def _appointment_to_response(appointment: Appointment) -> AppointmentResponse:
    doctor = appointment.doctor
    slot = appointment.slot
    clinic_name = doctor.clinic.name if doctor.clinic else None

    return AppointmentResponse(
        id=appointment.id,
        status=appointment.status,
        reason=appointment.reason,
        created_at=appointment.created_at,
        updated_at=appointment.updated_at,
        cancelled_at=appointment.cancelled_at,
        doctor=AppointmentDoctorSummary(
            id=doctor.user_id,
            first_name=doctor.first_name,
            last_name=doctor.last_name,
            clinic_name=clinic_name,
            city=doctor.city,
            region=doctor.region,
            country=doctor.country,
        ),
        slot=AppointmentSlotResponse(
            id=slot.id,
            start_time=slot.start_time,
            end_time=slot.end_time,
            status=slot.status,
        ),
    )


@router.get("/me", response_model=PatientProfileResponse)
def get_my_profile(patient: Patient = Depends(get_current_patient)) -> PatientProfileResponse:
    return PatientProfileResponse.from_model(patient)


@router.get("/me/appointments", response_model=AppointmentListResponse)
def list_my_appointments(
    request: Request,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
    status_filter: Optional[AppointmentStatus] = Query(None, alias="status"),
    date_from: Optional[datetime] = Query(None, alias="from"),
    date_to: Optional[datetime] = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
) -> AppointmentListResponse:
    query = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.doctor).joinedload(Doctor.clinic),
            joinedload(Appointment.slot),
        )
        .filter(Appointment.patient_id == patient.user_id)
        .join(Appointment.slot)
    )

    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    if date_from:
        query = query.filter(Slot.start_time >= date_from)
    if date_to:
        query = query.filter(Slot.start_time <= date_to)

    total = query.count()
    offset = (page - 1) * limit
    appointments = (
        query.order_by(Slot.start_time.asc()).offset(offset).limit(limit).all()
    )

    items = [_appointment_to_response(app) for app in appointments]

    log_audit_event(
        db,
        action="patient.appointments.listed",
        resource="appointment",
        request=request,
        user_id=patient.user_id,
        metadata={
            "count": len(items),
            "page": page,
            "limit": limit,
        },
        use_separate_session=True,
    )

    return AppointmentListResponse(items=items, total=total, page=page, limit=limit)


@router.post("/me/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> AppointmentResponse:
    appointment = book_appointment(
        db,
        patient=patient,
        doctor_id=payload.doctor_id,
        slot_id=payload.slot_id,
        reason=payload.reason,
        request=request,
    )

    db.refresh(appointment, attribute_names=["doctor", "slot"])
    return _appointment_to_response(appointment)


@router.patch("/me/appointments/{appointment_id}/reschedule", response_model=AppointmentResponse)
def reschedule_my_appointment(
    appointment_id: int,
    payload: AppointmentRescheduleRequest,
    request: Request,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> AppointmentResponse:
    appointment = reschedule_appointment(
        db,
        appointment_id=appointment_id,
        patient=patient,
        new_slot_id=payload.slot_id,
        request=request,
    )

    db.refresh(appointment, attribute_names=["doctor", "slot"])
    return _appointment_to_response(appointment)


@router.post("/me/appointments/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_my_appointment(
    appointment_id: int,
    payload: AppointmentCancelRequest,
    request: Request,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> AppointmentResponse:
    appointment = cancel_appointment(
        db,
        appointment_id=appointment_id,
        patient=patient,
        reason=payload.reason,
        request=request,
    )

    db.refresh(appointment, attribute_names=["doctor", "slot"])
    return _appointment_to_response(appointment)


@router.put("/me", response_model=PatientProfileResponse)
def update_my_profile(
    payload: PatientProfileUpdate,
    request: Request,
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
) -> PatientProfileResponse:
    updated_fields: Dict[str, str | None] = {}

    if payload.first_name is not None:
        new_first = payload.first_name.strip()
        if not new_first:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="First name cannot be blank")
        if new_first != patient.first_name:
            patient.first_name = new_first
            updated_fields["first_name"] = new_first

    if payload.last_name is not None:
        new_last = payload.last_name.strip()
        if not new_last:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Last name cannot be blank")
        if new_last != patient.last_name:
            patient.last_name = new_last
            updated_fields["last_name"] = new_last

    if payload.phone is not None:
        new_phone = payload.phone.strip() if payload.phone else None
        if new_phone == "":
            new_phone = None
        if new_phone != patient.phone:
            patient.phone = new_phone
            updated_fields["phone"] = new_phone

    if payload.preferred_language is not None:
        new_lang = payload.preferred_language.strip().lower()
        if new_lang:
            language_exists = (
                db.query(Language)
                .filter(Language.code == new_lang)
                .first()
            )
            if not language_exists:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Preferred language not supported")
        else:
            new_lang = None
        if new_lang != patient.preferred_language:
            patient.preferred_language = new_lang
            updated_fields["preferred_language"] = new_lang

    if not updated_fields:
        return PatientProfileResponse.from_model(patient)

    db.add(patient)
    db.commit()
    db.refresh(patient)

    log_audit_event(
        db,
        action="patient.profile.updated",
        resource="patient",
        request=request,
        user_id=patient.user_id,
        metadata={"updated_fields": updated_fields},
        use_separate_session=True,
    )

    return PatientProfileResponse.from_model(patient)
