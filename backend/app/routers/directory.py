from __future__ import annotations

import json
from datetime import datetime, timedelta, date as date_type
from hashlib import sha256
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from redis.exceptions import RedisError

from app.db.models import (
    Doctor,
    Language,
    Slot,
    SlotStatus,
    Specialty,
    UserRole,
)
from app.db.session import get_db
from app.infra.redis_client import get_redis_client
from app.schemas.directory import (
    DoctorDetail,
    DoctorSummary,
    LanguageResponse,
    PaginatedDoctorResponse,
    SpecialtyResponse,
    SlotResponse,
    ClinicResponse,
)

router = APIRouter(tags=["directory"])

CACHE_TTL_SPECIALTIES = 60 * 60 * 24  # 24h
CACHE_TTL_SEARCH = 60 * 5  # 5 min
CACHE_TTL_DOCTOR = 60 * 15  # 15 min
CACHE_TTL_SLOTS = 60 * 5  # 5 min


def _json_dumps(payload: Any) -> str:
    def default(obj: Any):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return obj

    return json.dumps(payload, default=default)


def _safe_cache_get(cache, key: str):
    try:
        return cache.get(key)
    except RedisError:
        return None


def _safe_cache_set(cache, key: str, ttl: int, value: str) -> None:
    try:
        cache.setex(key, ttl, value)
    except RedisError:
        return None


def _doctor_to_summary(doctor: Doctor) -> DoctorSummary:
    return DoctorSummary(
        id=doctor.user_id,
        email=doctor.user.email,
        first_name=doctor.first_name,
        last_name=doctor.last_name,
        city=doctor.city,
        region=doctor.region,
        country=doctor.country,
        verified=doctor.verified,
        specialties=[SpecialtyResponse.model_validate(spec) for spec in doctor.specialties],
        languages=[LanguageResponse.model_validate(lang) for lang in doctor.languages],
    )


def _doctor_to_detail(doctor: Doctor, slots: List[Slot]) -> DoctorDetail:
    summary = _doctor_to_summary(doctor)
    clinic = ClinicResponse.model_validate(doctor.clinic) if doctor.clinic else None
    slot_responses = [
        SlotResponse.model_validate(slot)
        for slot in slots
    ]
    return DoctorDetail(
        **summary.model_dump(),
        bio=doctor.bio,
        clinic=clinic,
        slots=slot_responses,
    )


@router.get("/specialties", response_model=List[SpecialtyResponse])
def list_specialties(db: Session = Depends(get_db)) -> List[SpecialtyResponse]:
    cache = get_redis_client()
    cached = _safe_cache_get(cache, "specialties:list")
    if cached:
        data = json.loads(cached)
        return [SpecialtyResponse(**item) for item in data]

    items = db.query(Specialty).order_by(Specialty.name.asc()).all()
    payload = [SpecialtyResponse.model_validate(item).model_dump() for item in items]
    _safe_cache_set(cache, "specialties:list", CACHE_TTL_SPECIALTIES, _json_dumps(payload))
    return [SpecialtyResponse(**item) for item in payload]


@router.get("/doctors", response_model=PaginatedDoctorResponse)
def search_doctors(
    db: Session = Depends(get_db),
    specialty: Optional[str] = Query(None, description="Specialty slug"),
    city: Optional[str] = Query(None, description="City name"),
    language: Optional[str] = Query(None, description="Language code"),
    date: Optional[date_type] = Query(None, description="Filter by date with available slots"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
) -> PaginatedDoctorResponse:
    filters: Dict[str, Any] = {
        "specialty": specialty.lower() if specialty else None,
        "city": city.lower() if city else None,
        "language": language.lower() if language else None,
        "date": date.isoformat() if date else None,
        "page": page,
        "limit": limit,
    }

    cache = get_redis_client()
    cache_key = "search:doctors:" + sha256(_json_dumps(filters).encode()).hexdigest()
    cached = _safe_cache_get(cache, cache_key)
    if cached:
        data = json.loads(cached)
        return PaginatedDoctorResponse(**data)

    query = (
        db.query(Doctor)
        .options(
            joinedload(Doctor.user),
            joinedload(Doctor.specialties),
            joinedload(Doctor.languages),
        )
        .filter(Doctor.verified.is_(True), Doctor.user.has(role=UserRole.doctor))
    )

    if specialty:
        query = query.join(Doctor.specialties).filter(Specialty.slug == specialty.lower())

    if city:
        city_like = f"%{city.lower()}%"
        query = query.filter(Doctor.city.ilike(city_like))

    if language:
        query = query.join(Doctor.languages).filter(Language.code == language.lower())

    if date:
        start_dt = datetime.combine(date, datetime.min.time())
        end_dt = start_dt + timedelta(days=1)
        query = query.join(Doctor.slots).filter(
            and_(
                Slot.start_time >= start_dt,
                Slot.start_time < end_dt,
                Slot.status == SlotStatus.free,
            )
        )

    query = query.distinct()

    total = query.count()
    offset = (page - 1) * limit
    doctors = query.order_by(Doctor.last_name.asc()).offset(offset).limit(limit).all()

    summaries = [_doctor_to_summary(doc).model_dump() for doc in doctors]

    response = PaginatedDoctorResponse(items=[DoctorSummary(**item) for item in summaries], page=page, limit=limit, total=total)
    _safe_cache_set(cache, cache_key, CACHE_TTL_SEARCH, _json_dumps(response.model_dump()))
    return response


@router.get("/doctors/{doctor_id}", response_model=DoctorDetail)
def get_doctor_detail(doctor_id: int, db: Session = Depends(get_db)) -> DoctorDetail:
    cache = get_redis_client()
    profile_key = f"doctor:profile:{doctor_id}"
    slots_key = f"doctor:nextSlots:{doctor_id}"
    cached_profile = _safe_cache_get(cache, profile_key)
    cached_slots = _safe_cache_get(cache, slots_key)
    if cached_profile and cached_slots:
        base_data = json.loads(cached_profile)
        base_data["slots"] = json.loads(cached_slots)
        return DoctorDetail(**base_data)

    doctor = (
        db.query(Doctor)
        .options(
            joinedload(Doctor.user),
            joinedload(Doctor.specialties),
            joinedload(Doctor.languages),
            joinedload(Doctor.clinic),
        )
        .filter(Doctor.user_id == doctor_id, Doctor.verified.is_(True))
        .first()
    )

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    now = datetime.utcnow()
    horizon = now + timedelta(days=14)

    slots = (
        db.query(Slot)
        .filter(
            Slot.doctor_id == doctor_id,
            Slot.start_time >= now,
            Slot.start_time < horizon,
            Slot.status == SlotStatus.free,
        )
        .order_by(Slot.start_time.asc())
        .limit(20)
        .all()
    )

    detail = _doctor_to_detail(doctor, slots)
    serialized = detail.model_dump()
    slots_payload = serialized.pop("slots", [])
    _safe_cache_set(cache, profile_key, CACHE_TTL_DOCTOR, _json_dumps(serialized))
    _safe_cache_set(cache, slots_key, CACHE_TTL_SLOTS, _json_dumps(slots_payload))
    serialized["slots"] = slots_payload
    return DoctorDetail(**serialized)
