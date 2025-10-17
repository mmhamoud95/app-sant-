from datetime import datetime, timedelta
from uuid import uuid4

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test.db")

from app.main import app
from app.db.base import Base
from app.db.models import AuditLog, Doctor, User, UserRole
from app.db.session import SessionLocal, engine
from app.auth.utils import hash_password
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
PASSWORD = "AdminStr0ngPass!"


def _reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8]}@example.com"


def _create_admin(email: str) -> None:
    with SessionLocal() as session:
        admin_user = User(
            email=email,
            password_hash=hash_password(PASSWORD),
            role=UserRole.admin,
        )
        session.add(admin_user)
        session.commit()


def _register_doctor(email: str) -> dict:
    payload = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Ada",
        "last_name": "Lovelace",
        "phone": "+3301010101",
        "bio": "Visionary",
        "clinic_name": "Logic Clinic",
        "clinic_city": "Paris",
        "clinic_country": "France",
        "specialties": ["cardiology"],
        "languages": ["fr"],
    }
    response = client.post("/api/v1/auth/doctor/register", json=payload)
    assert response.status_code == 201
    return response.json()


def _login(email: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_admin_can_verify_doctors(fake_redis: FakeRedis) -> None:
    _reset_db()

    admin_email = _unique_email("admin")
    doctor_email = _unique_email("doctor")

    _create_admin(admin_email)
    doctor_payload = _register_doctor(doctor_email)

    admin_token = _login(admin_email)

    pending_response = client.get(
        "/api/v1/admin/doctors",
        headers=_auth_headers(admin_token),
        params={"status": "pending"},
    )
    assert pending_response.status_code == 200
    pending_payload = pending_response.json()
    assert pending_payload["total"] == 1
    assert pending_payload["items"][0]["id"] == doctor_payload["id"]
    assert pending_payload["items"][0]["verified"] is False

    verify_response = client.post(
        f"/api/v1/admin/doctors/{doctor_payload['id']}/verify",
        headers=_auth_headers(admin_token),
        json={"verified": True, "note": "Documents reviewed"},
    )
    assert verify_response.status_code == 200
    verified_payload = verify_response.json()
    assert verified_payload["verified"] is True
    assert verified_payload["note"] == "Documents reviewed"

    with SessionLocal() as session:
        doctor = session.query(Doctor).filter(Doctor.user_id == doctor_payload["id"]).first()
        assert doctor.verified is True
        audit = (
            session.query(AuditLog)
            .filter(AuditLog.action == "admin.doctor.verified")
            .order_by(AuditLog.id.desc())
            .first()
        )
        assert audit is not None
        assert audit.metadata_json.get("doctor_id") == doctor_payload["id"]

    verified_response = client.get(
        "/api/v1/admin/doctors",
        headers=_auth_headers(admin_token),
        params={"status": "verified"},
    )
    assert verified_response.status_code == 200
    verified_list = verified_response.json()
    assert verified_list["total"] == 1
    assert verified_list["items"][0]["id"] == doctor_payload["id"]
    assert verified_list["items"][0]["verified"] is True