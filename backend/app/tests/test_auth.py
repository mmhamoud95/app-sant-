from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.db.base import Base
from app.db.models import AuditLog, Doctor
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

    # ensure compatibility with redis client interface used by rate limiter
    monkeypatch.setattr("app.routers.auth.get_redis_client", lambda: fake)
    monkeypatch.setattr("app.services.rate_limiter.get_redis_client", lambda: fake)
    return fake


client = TestClient(app)
PASSWORD = "VerySecurePass123"


def _unique_email() -> str:
    return f"user-{uuid4().hex}@example.com"


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


def _register_doctor(email: str) -> dict:
    payload = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Doc",
        "last_name": "Strange",
        "phone": "+33000000001",
        "bio": "Helpful doctor",
        "clinic_name": "Health Hub",
        "clinic_city": "Paris",
        "clinic_country": "France",
        "specialties": ["cardiology"],
        "languages": ["fr"],
    }
    response = client.post("/api/v1/auth/doctor/register", json=payload)
    assert response.status_code == 201
    return response.json()


def test_login_sets_refresh_cookie_and_returns_token(fake_redis: FakeRedis) -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()
    email = _unique_email()
    _register_patient(email)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["expires_in"] == settings.access_token_exp_minutes * 60

    refresh_cookie = response.cookies.get(settings.refresh_token_cookie_name)
    assert refresh_cookie is not None and refresh_cookie != ""


def test_refresh_rotates_token_and_invalidates_previous(fake_redis: FakeRedis) -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()
    email = _unique_email()
    _register_patient(email)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert login_response.status_code == 200
    first_cookie = login_response.cookies.get(settings.refresh_token_cookie_name)
    assert first_cookie

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        cookies={settings.refresh_token_cookie_name: first_cookie},
    )
    assert refresh_response.status_code == 200
    new_cookie = refresh_response.cookies.get(settings.refresh_token_cookie_name)
    assert new_cookie and new_cookie != first_cookie

    reuse_response = client.post(
        "/api/v1/auth/refresh",
        cookies={settings.refresh_token_cookie_name: first_cookie},
    )
    assert reuse_response.status_code == 401


def test_logout_clears_cookie_and_blacklists_token(fake_redis: FakeRedis) -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()
    email = _unique_email()
    _register_patient(email)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert login_response.status_code == 200
    refresh_cookie = login_response.cookies.get(settings.refresh_token_cookie_name)
    assert refresh_cookie

    logout_response = client.post(
        "/api/v1/auth/logout",
        cookies={settings.refresh_token_cookie_name: refresh_cookie},
    )
    assert logout_response.status_code == 200
    assert logout_response.json()["message"] == "Logged out"
    cleared_cookie = logout_response.cookies.get(settings.refresh_token_cookie_name)
    assert cleared_cookie in (None, "")

    refresh_after_logout = client.post(
        "/api/v1/auth/refresh",
        cookies={settings.refresh_token_cookie_name: refresh_cookie},
    )
    assert refresh_after_logout.status_code == 401


def test_me_returns_current_user(fake_redis: FakeRedis) -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()
    email = _unique_email()
    register_payload = _register_patient(email)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_response.status_code == 200
    me_payload = me_response.json()
    assert me_payload["id"] == register_payload["id"]
    assert me_payload["email"] == email
    assert me_payload["role"] == "patient"


def test_login_rate_limit_blocks_excess_attempts(fake_redis: FakeRedis, monkeypatch: pytest.MonkeyPatch) -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()
    email = _unique_email()
    _register_patient(email)

    monkeypatch.setattr(settings, "login_rate_limit_per_ip", 0)
    monkeypatch.setattr(settings, "login_rate_limit_per_email", 3)

    for _ in range(3):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": PASSWORD},
        )
        assert response.status_code == 200

    blocked_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert blocked_response.status_code == 429
    assert blocked_response.json()["detail"] == "Too many requests"


def test_audit_log_created_for_failed_login(fake_redis: FakeRedis) -> None:
    assert fake_redis._store == {}
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()
    email = _unique_email()
    _register_patient(email)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword123"},
    )
    assert response.status_code == 401

    with SessionLocal() as session:
        logs = (
            session.query(AuditLog)
            .filter(AuditLog.action == "auth.login.failed")
            .all()
        )
        matching = [log for log in logs if (log.metadata_json or {}).get("email") == email]
        assert matching, "Expected audit log with matching email"
        latest_log = matching[-1]
        assert latest_log.metadata_json.get("reason") == "invalid_credentials"
        assert latest_log.ip_address is not None


def test_audit_log_created_for_refresh_success(fake_redis: FakeRedis) -> None:
    assert fake_redis._store == {}
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()
    email = _unique_email()
    _register_patient(email)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert login_response.status_code == 200
    refresh_cookie = login_response.cookies.get(settings.refresh_token_cookie_name)
    assert refresh_cookie

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        cookies={settings.refresh_token_cookie_name: refresh_cookie},
    )
    assert refresh_response.status_code == 200

    with SessionLocal() as session:
        log = (
            session.query(AuditLog)
            .filter(AuditLog.action == "auth.refresh.success")
            .order_by(AuditLog.id.desc())
            .first()
        )
        assert log is not None
        assert log.user_id is not None
        assert log.metadata_json is not None
        assert log.metadata_json.get("new_token_id") is not None


def test_doctor_login_requires_verification(fake_redis: FakeRedis) -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()

    doctor_email = _unique_email()
    doctor_payload = _register_doctor(doctor_email)

    # Login should be blocked until verified
    blocked_response = client.post(
        "/api/v1/auth/login",
        json={"email": doctor_email, "password": PASSWORD},
    )
    assert blocked_response.status_code == 403
    assert blocked_response.json()["detail"] == "Doctor account pending verification"

    with SessionLocal() as session:
        doctor = session.query(Doctor).filter(Doctor.user_id == doctor_payload["id"]).first()
        assert doctor is not None
        doctor.verified = True
        session.commit()

    success_response = client.post(
        "/api/v1/auth/login",
        json={"email": doctor_email, "password": PASSWORD},
    )
    assert success_response.status_code == 200
    payload = success_response.json()
    assert payload["access_token"]
