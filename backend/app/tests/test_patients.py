from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.db.base import Base
from app.db.models import AuditLog, Patient
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
    return fake


client = TestClient(app)
PASSWORD = "VerySecurePass123"


def _unique_email() -> str:
    return f"patient-{uuid4().hex}@example.com"


def _register_patient(email: str) -> dict:
    payload = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Test",
        "last_name": "User",
        "phone": "+33000000000",
        "preferred_language": "fr",
    }
    response = client.post("/api/v1/auth/patient/register", json=payload)
    assert response.status_code == 201
    return response.json()


def _login(email: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["expires_in"] == settings.access_token_exp_minutes * 60
    return payload["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()


def test_get_patient_profile_returns_data(fake_redis: FakeRedis) -> None:
    _reset_db()
    email = _unique_email()
    register_payload = _register_patient(email)
    token = _login(email)

    response = client.get("/api/v1/patients/me", headers=_auth_headers(token))
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == register_payload["id"]
    assert payload["email"] == email
    assert payload["first_name"] == "Test"
    assert payload["preferred_language"] == "fr"


def test_update_patient_profile_persists_changes(fake_redis: FakeRedis) -> None:
    _reset_db()
    email = _unique_email()
    _register_patient(email)
    token = _login(email)

    update_payload = {
        "first_name": "Updated",
        "phone": " ",
        "preferred_language": "EN",
    }
    response = client.put(
        "/api/v1/patients/me",
        headers=_auth_headers(token),
        json=update_payload,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated"
    assert data["preferred_language"] == "en"
    assert data["phone"] is None

    with SessionLocal() as session:
        patient = session.query(Patient).first()
        assert patient is not None
        assert patient.first_name == "Updated"
        assert patient.preferred_language == "en"
        audit_entry = (
            session.query(AuditLog)
            .filter(AuditLog.action == "patient.profile.updated")
            .order_by(AuditLog.id.desc())
            .first()
        )
        assert audit_entry is not None
        assert audit_entry.user_id == patient.user_id
        metadata = audit_entry.metadata_json or {}
        assert metadata.get("updated_fields") is not None
        assert "first_name" in metadata["updated_fields"]


def test_update_patient_profile_with_invalid_language_returns_400(fake_redis: FakeRedis) -> None:
    _reset_db()
    email = _unique_email()
    _register_patient(email)
    token = _login(email)

    response = client.put(
        "/api/v1/patients/me",
        headers=_auth_headers(token),
        json={"preferred_language": "xx"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Preferred language not supported"
