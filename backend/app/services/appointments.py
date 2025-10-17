from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import (
    Appointment,
    AppointmentStatus,
    Doctor,
    Patient,
    Slot,
    SlotStatus,
)
from app.services.audit import log_audit_event
from app.services.notifications import (
    schedule_booking_notifications,
    schedule_cancellation_notifications,
    schedule_reschedule_notifications,
)


def _ensure_doctor(db: Session, doctor_id: int) -> Doctor:
    doctor = db.query(Doctor).filter(Doctor.user_id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    if not doctor.verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor is not verified")
    return doctor


def _utcnow() -> datetime:
    return datetime.utcnow()


def _lock_slot(db: Session, slot_id: int) -> Slot:
    slot = (
        db.query(Slot)
        .filter(Slot.id == slot_id)
        .with_for_update()
        .first()
    )
    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")
    return slot


def book_appointment(
    db: Session,
    *,
    patient: Patient,
    doctor_id: int,
    slot_id: int,
    reason: Optional[str],
    request: Request | None,
) -> Appointment:
    doctor = _ensure_doctor(db, doctor_id)
    slot = _lock_slot(db, slot_id)

    if slot.doctor_id != doctor_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot does not belong to doctor")
    if slot.status != SlotStatus.free:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot is no longer available")

    now = _utcnow()
    if slot.start_time <= now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot book past slots")

    appointment = Appointment(
        patient_id=patient.user_id,
        doctor_id=doctor_id,
        slot_id=slot_id,
        status=AppointmentStatus.booked,
        reason=reason.strip() if reason else None,
    )

    slot.status = SlotStatus.reserved

    db.add(appointment)

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot already booked")

    # Ensure related data is loaded for notification payloads
    _ = appointment.patient, appointment.doctor, appointment.slot
    schedule_booking_notifications(db, appointment)

    log_audit_event(
        db,
        action="appointment.booked",
        resource="appointment",
        request=request,
        user_id=patient.user_id,
        metadata={
            "appointment_id": appointment.id,
            "doctor_id": doctor_id,
            "slot_id": slot_id,
        },
        use_separate_session=True,
    )

    db.commit()
    db.refresh(appointment)
    return appointment


def reschedule_appointment(
    db: Session,
    *,
    appointment_id: int,
    patient: Patient,
    new_slot_id: int,
    request: Request | None,
) -> Appointment:
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id, Appointment.patient_id == patient.user_id)
        .with_for_update()
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if appointment.status in {AppointmentStatus.cancelled, AppointmentStatus.completed}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment cannot be rescheduled")

    current_slot = _lock_slot(db, appointment.slot_id)
    new_slot = _lock_slot(db, new_slot_id)

    if new_slot.id == current_slot.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment already uses this slot")

    if new_slot.doctor_id != appointment.doctor_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot belongs to another doctor")
    if new_slot.status != SlotStatus.free:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot is no longer available")

    now = _utcnow()
    if new_slot.start_time <= now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reschedule to past slots")

    current_slot.status = SlotStatus.free
    new_slot.status = SlotStatus.reserved
    appointment.slot_id = new_slot.id
    appointment.status = AppointmentStatus.booked

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot already booked")

    _ = appointment.patient, appointment.doctor, appointment.slot
    schedule_reschedule_notifications(db, appointment)

    log_audit_event(
        db,
        action="appointment.rescheduled",
        resource="appointment",
        request=request,
        user_id=patient.user_id,
        metadata={
            "appointment_id": appointment.id,
            "old_slot_id": current_slot.id,
            "new_slot_id": new_slot.id,
        },
        use_separate_session=True,
    )

    db.commit()
    db.refresh(appointment)
    return appointment


def cancel_appointment(
    db: Session,
    *,
    appointment_id: int,
    patient: Patient,
    reason: Optional[str],
    request: Request | None,
) -> Appointment:
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id, Appointment.patient_id == patient.user_id)
        .with_for_update()
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if appointment.status == AppointmentStatus.cancelled:
        return appointment
    if appointment.status == AppointmentStatus.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Completed appointments cannot be cancelled")

    slot = _lock_slot(db, appointment.slot_id)
    slot.status = SlotStatus.free

    appointment.status = AppointmentStatus.cancelled
    appointment.cancelled_at = _utcnow()
    if reason is not None:
        appointment.reason = reason.strip() or None

    db.flush()

    _ = appointment.patient, appointment.doctor, appointment.slot
    schedule_cancellation_notifications(db, appointment)

    log_audit_event(
        db,
        action="appointment.cancelled",
        resource="appointment",
        request=request,
        user_id=patient.user_id,
        metadata={
            "appointment_id": appointment.id,
            "slot_id": slot.id,
        },
        use_separate_session=True,
    )

    db.commit()
    db.refresh(appointment)
    return appointment