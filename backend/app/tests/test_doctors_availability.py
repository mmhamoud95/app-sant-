import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test.db")

from app.config import settings
from app.main import app
from app.db.base import Base
from app.db.models import (
    AvailabilityException,
    AvailabilityRule,
    Doctor,
    Slot,
    SlotStatus,
)
from app.db.session import SessionLocal, engine
from app.services.bootstrap import seed_reference_data


class FakeRedis:
    def __init__(self) -> None:
        self._store: dict[str, tuple[int, datetime | None]] = {}

    def setex(self, key: str, ttl: int, value: str) -> None:
        expire_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)
        try:
            numeric_value = int(value)
        except (TypeError, ValueError):
            numeric_value = 1
        self._store[key] = (numeric_value, expire_at)

    def exists(self, key: str) -> int:
        entry = self._store.get(key)
        if not entry:
            return 0
        _, expire_at = entry
        if datetime.now(timezone.utc) >= expire_at:
            self._store.pop(key, None)
            return 0
        return 1

    def incr(self, key: str, amount: int = 1) -> int:
        now = datetime.now(timezone.utc)
        value, expire_at = self._store.get(key, (0, None))
        if expire_at is not None and now >= expire_at:
            value = 0
            expire_at = None
        if not isinstance(value, int):
            value = 0
        value += amount
        self._store[key] = (value, expire_at)
        return value

    def expire(self, key: str, ttl: int) -> int:
        if key not in self._store:
            return 0
        value, _ = self._store[key]
        expire_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)
        self._store[key] = (value, expire_at)
        return 1

    def ttl(self, key: str) -> int:
        entry = self._store.get(key)
        if not entry:
            return -2
        _, expire_at = entry
        if expire_at is None:
            return -1
        delta = expire_at - datetime.now(timezone.utc)
        remaining = int(delta.total_seconds())
        if remaining < 0:
            self._store.pop(key, None)
            return -2
        return remaining


@pytest.fixture()
def fake_redis(monkeypatch: pytest.MonkeyPatch) -> FakeRedis:
    fake = FakeRedis()
    monkeypatch.setattr("app.routers.auth.get_redis_client", lambda: fake)
    monkeypatch.setattr("app.services.rate_limiter.get_redis_client", lambda: fake)
    return fake


client = TestClient(app)
PASSWORD = "VerySecurePass123"


def _reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()


def _unique_email() -> str:
    return f"doctor-{uuid4().hex}@example.com"


def _register_doctor(email: str) -> dict:
    payload = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Doc",
        "last_name": "Strange",
        "phone": "+33123456789",
        "bio": "Friendly doctor",
        "clinic_name": "One Clinic",
        "clinic_city": "Paris",
        "clinic_country": "France",
        "specialties": ["cardiology"],
        "languages": ["fr"],
    }
    response = client.post("/api/v1/auth/doctor/register", json=payload)
    assert response.status_code == 201
    doctor_payload = response.json()

    with SessionLocal() as session:
        doctor = session.query(Doctor).filter(Doctor.user_id == doctor_payload["id"]).first()
        assert doctor is not None
        doctor.verified = True
        session.commit()

    return doctor_payload


def _login(email: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_create_availability_rule_generates_slots(fake_redis: FakeRedis) -> None:
    _reset_db()
    email = _unique_email()
    doctor_payload = _register_doctor(email)
    token = _login(email)

    response = client.post(
        "/api/v1/doctors/me/availability",
        headers=_auth_headers(token),
        json={
            "kind": "rule",
            "rule": {
                "weekday": datetime.utcnow().weekday(),
                "start_time": "09:00",
                "end_time": "12:00",
                "slot_minutes": 30,
            },
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["kind"] == "rule"
    assert data["slot_minutes"] == 30

    with SessionLocal() as session:
        rules = session.query(AvailabilityRule).filter(AvailabilityRule.doctor_id == doctor_payload["id"]).all()
        assert len(rules) == 1
        slots = session.query(Slot).filter(Slot.doctor_id == doctor_payload["id"], Slot.status == SlotStatus.free).all()
        assert slots, "Expected generated slots"

    upcoming_slot_exists = any(slot.start_time >= datetime.utcnow() for slot in slots)
    assert upcoming_slot_exists, "Expected future slots generated"


def test_overlapping_rule_is_rejected(fake_redis: FakeRedis) -> None:
    _reset_db()
    email = _unique_email()
    _register_doctor(email)
    token = _login(email)
    weekday = (datetime.utcnow().weekday() + 1) % 7

    first = client.post(
        "/api/v1/doctors/me/availability",
        headers=_auth_headers(token),
        json={
            "kind": "rule",
            "rule": {
                "weekday": weekday,
                "start_time": "08:00",
                "end_time": "10:00",
                "slot_minutes": 60,
            },
        },
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/doctors/me/availability",
        headers=_auth_headers(token),
        json={
            "kind": "rule",
            "rule": {
                "weekday": weekday,
                "start_time": "09:30",
                "end_time": "11:00",
                "slot_minutes": 30,
            },
        },
    )
    assert second.status_code == 400
    assert second.json()["detail"] == "Availability rule overlaps with an existing rule"


def test_exception_blocks_future_day(fake_redis: FakeRedis) -> None:
    _reset_db()
    email = _unique_email()
    payload = _register_doctor(email)
    token = _login(email)

    tomorrow = datetime.utcnow().date() + timedelta(days=1)

    create_rule = client.post(
        "/api/v1/doctors/me/availability",
        headers=_auth_headers(token),
        json={
            "kind": "rule",
            "rule": {
                "weekday": tomorrow.weekday(),
                "start_time": "10:00",
                "end_time": "12:00",
                "slot_minutes": 30,
            },
        },
    )
    assert create_rule.status_code == 201

    create_exception = client.post(
        "/api/v1/doctors/me/availability",
        headers=_auth_headers(token),
        json={
            "kind": "exception",
            "exception": {
                "date": tomorrow.isoformat(),
                "is_closed": True,
                "reason": "Vacation",
            },
        },
    )
    assert create_exception.status_code == 201

    with SessionLocal() as session:
        exception = session.query(AvailabilityException).filter(AvailabilityException.doctor_id == payload["id"]).first()
        assert exception is not None
        slots = session.query(Slot).filter(Slot.doctor_id == payload["id"], Slot.status == SlotStatus.free).all()
        assert all(slot.start_time.date() != tomorrow for slot in slots)


def test_delete_rule_removes_slots(fake_redis: FakeRedis) -> None:
    _reset_db()
    email = _unique_email()
    doctor_payload = _register_doctor(email)
    token = _login(email)

    weekday = (datetime.utcnow().weekday() + 2) % 7

    create_rule = client.post(
        "/api/v1/doctors/me/availability",
        headers=_auth_headers(token),
        json={
            "kind": "rule",
            "rule": {
                "weekday": weekday,
                "start_time": "14:00",
                "end_time": "16:00",
                "slot_minutes": 30,
            },
        },
    )
    assert create_rule.status_code == 201
    rule_id = create_rule.json()["id"]

    delete_response = client.delete(
        f"/api/v1/doctors/me/availability/{rule_id}",
        headers=_auth_headers(token),
    )
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Availability entry deleted"

    with SessionLocal() as session:
        existing = session.query(AvailabilityRule).filter(AvailabilityRule.doctor_id == doctor_payload["id"]).all()
        assert not existing
        future_slots = session.query(Slot).filter(Slot.doctor_id == doctor_payload["id"], Slot.status == SlotStatus.free).all()
        assert not future_slots


def test_get_availability_returns_rules_and_exceptions(fake_redis: FakeRedis) -> None:
    _reset_db()
    email = _unique_email()
    _register_doctor(email)
    token = _login(email)

    today_weekday = datetime.utcnow().weekday()

    client.post(
        "/api/v1/doctors/me/availability",
        headers=_auth_headers(token),
        json={
            "kind": "rule",
            "rule": {
                "weekday": today_weekday,
                "start_time": "09:00",
                "end_time": "10:00",
                "slot_minutes": 30,
            },
        },
    )

    tomorrow = datetime.utcnow().date() + timedelta(days=1)
    client.post(
        "/api/v1/doctors/me/availability",
        headers=_auth_headers(token),
        json={
            "kind": "exception",
            "exception": {
                "date": tomorrow.isoformat(),
                "is_closed": True,
            },
        },
    )

    response = client.get(
        "/api/v1/doctors/me/availability",
        headers=_auth_headers(token),
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["rules"]) == 1
    assert len(payload["exceptions"]) == 1
    assert payload["rules"][0]["weekday"] == today_weekday
    assert payload["exceptions"][0]["date"] == tomorrow.isoformat()
