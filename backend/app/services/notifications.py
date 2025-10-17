from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Mapping, Optional

from sqlalchemy.orm import Session

from app.db.models import Appointment, Notification, NotificationStatus

REMINDER_LEAD_TIME = timedelta(hours=24)


def _utcnow() -> datetime:
    return datetime.utcnow()


def queue_notification(
    db: Session,
    *,
    user_id: int,
    notification_type: str,
    appointment_id: Optional[int] = None,
    payload: Optional[Mapping[str, Any]] = None,
    scheduled_for: Optional[datetime] = None,
) -> Notification:
    entry = Notification(
        user_id=user_id,
        appointment_id=appointment_id,
        type=notification_type,
        payload_json=dict(payload) if payload else None,
        status=NotificationStatus.pending,
        scheduled_for=scheduled_for,
    )
    db.add(entry)
    return entry


def cancel_pending_notifications(db: Session, *, appointment_id: int, reason: str) -> None:
    now = _utcnow()
    db.query(Notification).filter(
        Notification.appointment_id == appointment_id,
        Notification.status == NotificationStatus.pending,
    ).update(
        {
            "status": NotificationStatus.failed,
            "last_error": reason,
            "updated_at": now,
        },
        synchronize_session=False,
    )


def _reminder_time(slot_start: datetime) -> Optional[datetime]:
    reminder_at = slot_start - REMINDER_LEAD_TIME
    if reminder_at <= _utcnow():
        return None
    return reminder_at


def schedule_booking_notifications(db: Session, appointment: Appointment) -> None:
    slot = appointment.slot
    doctor = appointment.doctor
    patient = appointment.patient

    slot_start_iso = slot.start_time.isoformat()
    payload_base = {
        "appointment_id": appointment.id,
        "slot_start": slot_start_iso,
        "slot_end": slot.end_time.isoformat(),
        "doctor_id": doctor.user_id,
        "doctor_name": f"{doctor.first_name} {doctor.last_name}",
        "patient_id": patient.user_id,
        "patient_name": f"{patient.first_name} {patient.last_name}",
    }

    queue_notification(
        db,
        user_id=patient.user_id,
        appointment_id=appointment.id,
        notification_type="appointment.booked.patient",
        payload=payload_base,
    )
    queue_notification(
        db,
        user_id=doctor.user_id,
        appointment_id=appointment.id,
        notification_type="appointment.booked.doctor",
        payload=payload_base,
    )

    reminder_at = _reminder_time(slot.start_time)
    if reminder_at:
        queue_notification(
            db,
            user_id=patient.user_id,
            appointment_id=appointment.id,
            notification_type="appointment.reminder.patient",
            payload={**payload_base, "reminder_at": reminder_at.isoformat()},
            scheduled_for=reminder_at,
        )


def schedule_reschedule_notifications(db: Session, appointment: Appointment) -> None:
    cancel_pending_notifications(db, appointment_id=appointment.id, reason="rescheduled")
    slot = appointment.slot
    doctor = appointment.doctor
    patient = appointment.patient

    payload = {
        "appointment_id": appointment.id,
        "slot_start": slot.start_time.isoformat(),
        "slot_end": slot.end_time.isoformat(),
        "doctor_id": doctor.user_id,
        "doctor_name": f"{doctor.first_name} {doctor.last_name}",
        "patient_id": patient.user_id,
        "patient_name": f"{patient.first_name} {patient.last_name}",
    }

    queue_notification(
        db,
        user_id=patient.user_id,
        appointment_id=appointment.id,
        notification_type="appointment.rescheduled.patient",
        payload=payload,
    )
    queue_notification(
        db,
        user_id=doctor.user_id,
        appointment_id=appointment.id,
        notification_type="appointment.rescheduled.doctor",
        payload=payload,
    )

    reminder_at = _reminder_time(slot.start_time)
    if reminder_at:
        queue_notification(
            db,
            user_id=patient.user_id,
            appointment_id=appointment.id,
            notification_type="appointment.reminder.patient",
            payload={**payload, "reminder_at": reminder_at.isoformat()},
            scheduled_for=reminder_at,
        )


def schedule_cancellation_notifications(db: Session, appointment: Appointment) -> None:
    cancel_pending_notifications(db, appointment_id=appointment.id, reason="cancelled")

    slot = appointment.slot
    doctor = appointment.doctor
    patient = appointment.patient

    payload = {
        "appointment_id": appointment.id,
        "slot_start": slot.start_time.isoformat(),
        "doctor_id": doctor.user_id,
        "doctor_name": f"{doctor.first_name} {doctor.last_name}",
        "patient_id": patient.user_id,
        "patient_name": f"{patient.first_name} {patient.last_name}",
    }

    queue_notification(
        db,
        user_id=patient.user_id,
        appointment_id=appointment.id,
        notification_type="appointment.cancelled.patient",
        payload=payload,
    )
    queue_notification(
        db,
        user_id=doctor.user_id,
        appointment_id=appointment.id,
        notification_type="appointment.cancelled.doctor",
        payload=payload,
    )
