from __future__ import annotations

from datetime import date as dt_date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_doctor
from app.db.models import Appointment, AppointmentStatus, AvailabilityException, AvailabilityRule, Doctor, Patient, Slot
from app.db.session import get_db
from app.schemas.doctor_availability import (
    AvailabilityEntryResponse,
    AvailabilityExceptionResponse,
    AvailabilityRuleResponse,
    DoctorAvailabilityCreateRequest,
    DoctorAvailabilityResponse,
)
from app.schemas.doctor import (
    DoctorProfileResponse,
    DoctorProfileUpdate,
    DoctorAppointmentResponse,
    AppointmentPatientSummary,
)
from app.schemas.appointments import AppointmentListResponse
from app.auth.schemas import MessageResponse
from app.services.audit import log_audit_event
from app.services.availability import regenerate_slots_for_doctor

router = APIRouter(prefix="/doctors", tags=["doctors"])


def _rule_to_response(rule: AvailabilityRule) -> AvailabilityRuleResponse:
    return AvailabilityRuleResponse(
        id=f"rule-{rule.id}",
        weekday=rule.weekday,
        start_time=rule.start_time,
        end_time=rule.end_time,
        slot_minutes=rule.slot_minutes,
    )


def _exception_to_response(item: AvailabilityException) -> AvailabilityExceptionResponse:
    return AvailabilityExceptionResponse(
        id=f"exception-{item.id}",
        date=item.date,
        is_closed=item.is_closed,
        reason=item.reason,
    )


@router.get("/me", response_model=DoctorProfileResponse)
def get_my_profile(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
) -> DoctorProfileResponse:
    """Get the authenticated doctor's profile information."""
    # Load specialties and languages
    db.refresh(doctor, ["specialties", "languages"])
    
    clinic_name = doctor.clinic.name if doctor.clinic else None
    specialty_slugs = [s.slug for s in doctor.specialties]
    language_codes = [lang.code for lang in doctor.languages]
    
    return DoctorProfileResponse(
        user_id=doctor.user_id,
        first_name=doctor.first_name,
        last_name=doctor.last_name,
        phone=doctor.phone,
        bio=doctor.bio,
        verified=doctor.verified,
        clinic_name=clinic_name,
        city=doctor.city,
        region=doctor.region,
        country=doctor.country,
        specialties=specialty_slugs,
        languages=language_codes,
    )


@router.put("/me", response_model=DoctorProfileResponse)
def update_my_profile(
    payload: DoctorProfileUpdate,
    request: Request,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
) -> DoctorProfileResponse:
    """Update the authenticated doctor's profile information."""
    if payload.first_name is not None:
        doctor.first_name = payload.first_name
    if payload.last_name is not None:
        doctor.last_name = payload.last_name
    if payload.phone is not None:
        doctor.phone = payload.phone
    if payload.bio is not None:
        doctor.bio = payload.bio
    if payload.city is not None:
        doctor.city = payload.city
    if payload.region is not None:
        doctor.region = payload.region
    if payload.country is not None:
        doctor.country = payload.country
    
    db.commit()
    db.refresh(doctor, ["specialties", "languages"])
    
    log_audit_event(
        db,
        action="doctor.profile.updated",
        resource="doctor_profile",
        request=request,
        user_id=doctor.user_id,
        metadata={"doctor_id": doctor.user_id},
        use_separate_session=True,
    )
    
    clinic_name = doctor.clinic.name if doctor.clinic else None
    specialty_slugs = [s.slug for s in doctor.specialties]
    language_codes = [lang.code for lang in doctor.languages]
    
    return DoctorProfileResponse(
        user_id=doctor.user_id,
        first_name=doctor.first_name,
        last_name=doctor.last_name,
        phone=doctor.phone,
        bio=doctor.bio,
        verified=doctor.verified,
        clinic_name=clinic_name,
        city=doctor.city,
        region=doctor.region,
        country=doctor.country,
        specialties=specialty_slugs,
        languages=language_codes,
    )


@router.get("/me/appointments", response_model=AppointmentListResponse)
def get_my_appointments(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> AppointmentListResponse:
    """Get the authenticated doctor's appointments."""
    query = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.slot),
        )
        .filter(Appointment.doctor_id == doctor.user_id)
    )
    
    if status:
        try:
            status_enum = AppointmentStatus(status)
            query = query.filter(Appointment.status == status_enum)
        except ValueError:
            pass  # Invalid status, ignore filter
    
    total = query.count()
    
    # Order by slot start time descending (most recent first)
    query = query.join(Slot).order_by(Slot.start_time.desc())
    
    # Pagination
    offset = (page - 1) * limit
    appointments = query.offset(offset).limit(limit).all()
    
    # Convert to response format
    items = []
    for appt in appointments:
        patient = appt.patient
        slot = appt.slot
        
        items.append({
            "id": appt.id,
            "status": appt.status.value,
            "reason": appt.reason,
            "created_at": appt.created_at.isoformat(),
            "updated_at": appt.updated_at.isoformat(),
            "cancelled_at": appt.cancelled_at.isoformat() if appt.cancelled_at else None,
            "patient": {
                "id": patient.user_id,
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "phone": patient.phone,
            },
            "slot": {
                "id": slot.id,
                "start_time": slot.start_time.isoformat(),
                "end_time": slot.end_time.isoformat(),
                "status": slot.status.value,
            },
        })
    
    return AppointmentListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/me/availability", response_model=DoctorAvailabilityResponse)
def get_my_availability(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
) -> DoctorAvailabilityResponse:
    rules = (
        db.query(AvailabilityRule)
        .filter(AvailabilityRule.doctor_id == doctor.user_id)
        .order_by(AvailabilityRule.weekday, AvailabilityRule.start_time)
        .all()
    )
    exceptions = (
        db.query(AvailabilityException)
        .filter(AvailabilityException.doctor_id == doctor.user_id)
        .order_by(AvailabilityException.date)
        .all()
    )
    return DoctorAvailabilityResponse(
        rules=[_rule_to_response(rule) for rule in rules],
        exceptions=[_exception_to_response(exc) for exc in exceptions],
    )


@router.post(
    "/me/availability",
    response_model=AvailabilityEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_availability_entry(
    payload: DoctorAvailabilityCreateRequest,
    request: Request,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
) -> AvailabilityEntryResponse:
    if payload.kind == "rule":
        rule_data = payload.rule
        assert rule_data is not None

        overlap = (
            db.query(AvailabilityRule)
            .filter(
                AvailabilityRule.doctor_id == doctor.user_id,
                AvailabilityRule.weekday == rule_data.weekday,
                and_(
                    AvailabilityRule.start_time < rule_data.end_time,
                    AvailabilityRule.end_time > rule_data.start_time,
                ),
            )
            .first()
        )
        if overlap:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Availability rule overlaps with an existing rule")

        entity = AvailabilityRule(
            doctor_id=doctor.user_id,
            weekday=rule_data.weekday,
            start_time=rule_data.start_time,
            end_time=rule_data.end_time,
            slot_minutes=rule_data.slot_minutes,
        )
        db.add(entity)
        db.commit()
        db.refresh(entity)

        regenerate_slots_for_doctor(db, doctor)

        log_audit_event(
            db,
            action="doctor.availability.rule.created",
            resource="doctor_availability",
            request=request,
            user_id=doctor.user_id,
            metadata={
                "rule_id": entity.id,
                "weekday": entity.weekday,
                "start_time": entity.start_time.isoformat(),
                "end_time": entity.end_time.isoformat(),
                "slot_minutes": entity.slot_minutes,
            },
            use_separate_session=True,
        )

        return AvailabilityEntryResponse(
            id=f"rule-{entity.id}",
            kind="rule",
            weekday=entity.weekday,
            start_time=entity.start_time,
            end_time=entity.end_time,
            slot_minutes=entity.slot_minutes,
        )

    exception_data = payload.exception
    assert exception_data is not None

    if exception_data.date < dt_date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exception date cannot be in the past")

    existing_exception = (
        db.query(AvailabilityException)
        .filter(
            AvailabilityException.doctor_id == doctor.user_id,
            AvailabilityException.date == exception_data.date,
        )
        .first()
    )
    if existing_exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An exception already exists for that date")

    entity = AvailabilityException(
        doctor_id=doctor.user_id,
        date=exception_data.date,
        reason=exception_data.reason,
        is_closed=exception_data.is_closed,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)

    regenerate_slots_for_doctor(db, doctor)

    log_audit_event(
        db,
        action="doctor.availability.exception.created",
        resource="doctor_availability",
        request=request,
        user_id=doctor.user_id,
        metadata={
            "exception_id": entity.id,
            "date": entity.date.isoformat(),
            "is_closed": entity.is_closed,
        },
        use_separate_session=True,
    )

    return AvailabilityEntryResponse(
        id=f"exception-{entity.id}",
        kind="exception",
        date=entity.date,
        is_closed=entity.is_closed,
        reason=entity.reason,
    )


@router.delete("/me/availability/{item_id}", response_model=MessageResponse)
def delete_availability_entry(
    item_id: str,
    request: Request,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
) -> MessageResponse:
    if item_id.startswith("rule-"):
        raw_id = item_id.split("-", 1)[1]
        if not raw_id.isdigit():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid availability identifier")
        rule = (
            db.query(AvailabilityRule)
            .filter(
                AvailabilityRule.id == int(raw_id),
                AvailabilityRule.doctor_id == doctor.user_id,
            )
            .first()
        )
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability rule not found")
        db.delete(rule)
        db.commit()
        regenerate_slots_for_doctor(db, doctor)
        log_audit_event(
            db,
            action="doctor.availability.rule.deleted",
            resource="doctor_availability",
            request=request,
            user_id=doctor.user_id,
            metadata={"rule_id": int(raw_id)},
            use_separate_session=True,
        )
        return MessageResponse(message="Availability entry deleted")

    if item_id.startswith("exception-"):
        raw_id = item_id.split("-", 1)[1]
        if not raw_id.isdigit():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid availability identifier")
        exception = (
            db.query(AvailabilityException)
            .filter(
                AvailabilityException.id == int(raw_id),
                AvailabilityException.doctor_id == doctor.user_id,
            )
            .first()
        )
        if not exception:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability exception not found")
        db.delete(exception)
        db.commit()
        regenerate_slots_for_doctor(db, doctor)
        log_audit_event(
            db,
            action="doctor.availability.exception.deleted",
            resource="doctor_availability",
            request=request,
            user_id=doctor.user_id,
            metadata={"exception_id": int(raw_id)},
            use_separate_session=True,
        )
        return MessageResponse(message="Availability entry deleted")

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown availability identifier")
