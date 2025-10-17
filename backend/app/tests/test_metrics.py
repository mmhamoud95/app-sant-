from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.base import Base
from app.db.models import User, UserRole
from app.db.session import SessionLocal, engine
from app.auth.utils import hash_password
from app.services.bootstrap import seed_reference_data
from app.services.metrics import registry


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


def _reset_state() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_reference_data()
    registry.reset()


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


def _login(email: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_metrics_endpoint_requires_admin(fake_redis: FakeRedis) -> None:
    _reset_state()

    response = client.get("/api/v1/metrics")
    assert response.status_code == 401


def test_metrics_snapshot_includes_requests(fake_redis: FakeRedis) -> None:
    _reset_state()

    admin_email = _unique_email("admin")
    _create_admin(admin_email)
    admin_token = _login(admin_email)

    # Trigger a couple of requests to populate metrics
    health_response = client.get("/api/v1/health")
    assert health_response.status_code == 200

    _ = client.get("/api/v1/metrics", headers=_auth_headers(admin_token))

    metrics_response = client.get("/api/v1/metrics", headers=_auth_headers(admin_token))
    assert metrics_response.status_code == 200
    payload = metrics_response.json()

    assert payload["total_requests"] >= 3  # login + health + metrics
    assert payload["requests_by_path"].get("/api/v1/health") == 1
    assert payload["requests_by_status"].get("200") >= 2
    latency = payload["latency_ms"]
    assert set(latency.keys()) == {"average", "max"}