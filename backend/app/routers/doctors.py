from __future__ import annotations

from datetime import date as dt_date

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_doctor
from app.db.models import AvailabilityException, AvailabilityRule, Doctor
from app.db.session import get_db
from app.schemas.doctor_availability import (
    AvailabilityEntryResponse,
    AvailabilityExceptionResponse,
    AvailabilityRuleResponse,
    DoctorAvailabilityCreateRequest,
    DoctorAvailabilityResponse,
)
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
