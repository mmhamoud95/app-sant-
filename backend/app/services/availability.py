from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable

from sqlalchemy.orm import Session

from app.db.models import (
    AvailabilityException,
    AvailabilityRule,
    Doctor,
    Slot,
    SlotStatus,
)

DEFAULT_HORIZON_DAYS = 60


def _collect_reserved_slot_starts(
    db: Session,
    *,
    doctor_id: int,
    window_start: datetime,
    window_end: datetime,
) -> set[datetime]:
    rows: Iterable[tuple[datetime]] = (
        db.query(Slot.start_time)
        .filter(
            Slot.doctor_id == doctor_id,
            Slot.start_time >= window_start,
            Slot.start_time < window_end,
            Slot.status != SlotStatus.free,
        )
        .all()
    )
    return {row[0] for row in rows}


def regenerate_slots_for_doctor(
    db: Session,
    doctor: Doctor,
    *,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
) -> None:
    """Rebuild future free slots for the doctor based on current availability rules."""

    now = datetime.utcnow()
    window_end = now + timedelta(days=horizon_days)

    rules = (
        db.query(AvailabilityRule)
        .filter(AvailabilityRule.doctor_id == doctor.user_id)
        .order_by(AvailabilityRule.weekday, AvailabilityRule.start_time)
        .all()
    )

    exceptions = (
        db.query(AvailabilityException)
        .filter(
            AvailabilityException.doctor_id == doctor.user_id,
            AvailabilityException.date >= now.date(),
            AvailabilityException.date < window_end.date(),
        )
        .all()
    )

    closed_dates = {exc.date for exc in exceptions if exc.is_closed}

    # Remove existing free slots in the rolling window to avoid stale gaps.
    db.query(Slot).filter(
        Slot.doctor_id == doctor.user_id,
        Slot.status == SlotStatus.free,
        Slot.start_time >= now,
        Slot.start_time < window_end,
    ).delete(synchronize_session=False)

    reserved_starts = _collect_reserved_slot_starts(
        db,
        doctor_id=doctor.user_id,
        window_start=now,
        window_end=window_end,
    )

    new_slots: list[Slot] = []
    horizon_range = range(horizon_days)
    for day_offset in horizon_range:
        current_date = (now + timedelta(days=day_offset)).date()
        if current_date in closed_dates:
            continue

        weekday = current_date.weekday()
        applicable_rules = [rule for rule in rules if rule.weekday == weekday]
        if not applicable_rules:
            continue

        for rule in applicable_rules:
            slot_delta = timedelta(minutes=rule.slot_minutes)
            start_dt = datetime.combine(current_date, rule.start_time)
            end_dt = datetime.combine(current_date, rule.end_time)

            cursor = start_dt
            while cursor + slot_delta <= end_dt:
                if cursor <= now:
                    cursor += slot_delta
                    continue
                if cursor in reserved_starts:
                    cursor += slot_delta
                    continue
                slot_end = cursor + slot_delta
                new_slots.append(
                    Slot(
                        doctor_id=doctor.user_id,
                        start_time=cursor,
                        end_time=slot_end,
                        status=SlotStatus.free,
                    )
                )
                cursor += slot_delta

    if new_slots:
        db.bulk_save_objects(new_slots)

    db.commit()