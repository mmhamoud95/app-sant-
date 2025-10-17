from datetime import datetime, timedelta
from uuid import uuid4

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test.db")

from app.main import app
from app.db.base import Base
from app.db.models import (
    Appointment,
    AppointmentStatus,
    Doctor,
    Notification,
    NotificationStatus,
    Slot,
    SlotStatus,
)
from app.db.session import SessionLocal, engine
from app.services.bootstrap import seed_reference_data


class FakeRedis:
    def __init__(self) -> None:
        self._store: dict[str, tuple[int, datetime | None]] = {}

    def setex(self, key: str, ttl: int, value: str) -> None:
        expire_at = datetime.utcnow() + timedelta(seconds=ttl)
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
        if datetime.utcnow() >= expire_at:
            self._store.pop(key, None)
            return 0
        return 1

    def incr(self, key: str, amount: int = 1) -> int:
        now = datetime.utcnow()
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
        expire_at = datetime.utcnow() + timedelta(seconds=ttl)
        self._store[key] = (value, expire_at)
        return 1

    def ttl(self, key: str) -> int:
        entry = self._store.get(key)
        if not entry:
            return -2
        _, expire_at = entry
        if expire_at is None:
            return -1
        remaining = int((expire_at - datetime.utcnow()).total_seconds())
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
PASSWORD = "StrongPassw0rd!"


def _reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8]}@example.com"


def _register_patient(email: str) -> dict:
    payload = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Pat",
        "last_name": "Smith",
        "phone": "+33000000000",
        "preferred_language": "en",
    }
    response = client.post("/api/v1/auth/patient/register", json=payload)
    assert response.status_code == 201
    return response.json()


def _register_doctor(email: str) -> dict:
    payload = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Doc",
        "last_name": "Brown",
        "phone": "+33999999999",
        "bio": "Time traveler",
        "clinic_name": "Future Clinic",
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


def _create_slot(doctor_id: int, start: datetime, end: datetime) -> int:
    with SessionLocal() as session:
        slot = Slot(
            doctor_id=doctor_id,
            start_time=start,
            end_time=end,
            status=SlotStatus.free,
        )
        session.add(slot)
        session.commit()
        session.refresh(slot)
        return slot.id


def test_patient_appointment_lifecycle(fake_redis: FakeRedis) -> None:
    _reset_db()

    doctor_email = _unique_email("doctor")
    patient_email = _unique_email("patient")
    doctor = _register_doctor(doctor_email)
    _register_patient(patient_email)

    patient_token = _login(patient_email)

    start_one = datetime.utcnow() + timedelta(hours=4)
    end_one = start_one + timedelta(minutes=30)
    start_two = start_one + timedelta(hours=1)
    end_two = start_two + timedelta(minutes=30)

    slot_one = _create_slot(doctor["id"], start_one, end_one)
    slot_two = _create_slot(doctor["id"], start_two, end_two)

    create_response = client.post(
        "/api/v1/patients/me/appointments",
        headers=_auth_headers(patient_token),
        json={
            "doctor_id": doctor["id"],
            "slot_id": slot_one,
            "reason": "Routine check",
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["status"] == AppointmentStatus.booked.value
    assert created["slot"]["id"] == slot_one

    with SessionLocal() as session:
        appointment = session.query(Appointment).first()
        assert appointment is not None
        assert appointment.slot_id == slot_one
        slot = session.get(Slot, slot_one)
        assert slot.status == SlotStatus.reserved
        notifications = session.query(Notification).order_by(Notification.id.asc()).all()
        assert len(notifications) == 2
        types = {n.type for n in notifications}
        assert types == {
            "appointment.booked.patient",
            "appointment.booked.doctor",
        }
        assert all(n.status == NotificationStatus.pending for n in notifications)

    list_response = client.get(
        "/api/v1/patients/me/appointments",
        headers=_auth_headers(patient_token),
    )
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["id"] == created["id"]

    reschedule_response = client.patch(
        f"/api/v1/patients/me/appointments/{created['id']}/reschedule",
        headers=_auth_headers(patient_token),
        json={"slot_id": slot_two},
    )
    assert reschedule_response.status_code == 200
    rescheduled = reschedule_response.json()
    assert rescheduled["slot"]["id"] == slot_two

    with SessionLocal() as session:
        appointment = session.query(Appointment).first()
        assert appointment.slot_id == slot_two
        first_slot = session.get(Slot, slot_one)
        second_slot = session.get(Slot, slot_two)
        assert first_slot.status == SlotStatus.free
        assert second_slot.status == SlotStatus.reserved
        notifications = session.query(Notification).order_by(Notification.id.asc()).all()
        assert len(notifications) == 4
        status_by_type = {n.type: n.status for n in notifications}
        assert status_by_type["appointment.booked.patient"] == NotificationStatus.failed
        assert status_by_type["appointment.booked.doctor"] == NotificationStatus.failed
        assert status_by_type["appointment.rescheduled.patient"] == NotificationStatus.pending
        assert status_by_type["appointment.rescheduled.doctor"] == NotificationStatus.pending

    cancel_response = client.post(
        f"/api/v1/patients/me/appointments/{created['id']}/cancel",
        headers=_auth_headers(patient_token),
        json={"reason": "Feeling better"},
    )
    assert cancel_response.status_code == 200
    cancelled = cancel_response.json()
    assert cancelled["status"] == AppointmentStatus.cancelled.value
    assert cancelled["slot"]["id"] == slot_two

    with SessionLocal() as session:
        appointment = session.query(Appointment).first()
        assert appointment.status == AppointmentStatus.cancelled
        final_slot = session.get(Slot, slot_two)
        assert final_slot.status == SlotStatus.free
        notifications = session.query(Notification).order_by(Notification.id.asc()).all()
        assert len(notifications) == 6
        pending_types = {n.type for n in notifications if n.status == NotificationStatus.pending}
        assert pending_types == {
            "appointment.cancelled.patient",
            "appointment.cancelled.doctor",
        }