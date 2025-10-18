import pytest
from httpx import AsyncClient
from app.main import app
from app.db.session import SessionLocal
import pyotp
from datetime import datetime, timedelta, timezone


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


@pytest.fixture
def fake_redis(monkeypatch: pytest.MonkeyPatch) -> FakeRedis:
    fake = FakeRedis()
    monkeypatch.setattr("app.routers.auth.get_redis_client", lambda: fake)
    monkeypatch.setattr("app.services.rate_limiter.get_redis_client", lambda: fake)
    return fake


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.mark.anyio
async def test_2fa_status_disabled_by_default(db, fake_redis):
    """Test that 2FA is disabled by default"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login
        patient_data = {
            "email": "patient_2fa_status@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_2fa_status@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Check 2FA status
        status_response = await client.get(
            "/api/v1/2fa/status",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert status_response.status_code == 200
        assert status_response.json()["enabled"] is False


@pytest.mark.anyio
async def test_2fa_setup(db, fake_redis):
    """Test setting up 2FA"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login
        patient_data = {
            "email": "patient_2fa_setup@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_2fa_setup@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Setup 2FA
        setup_response = await client.post(
            "/api/v1/2fa/setup",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert setup_response.status_code == 200
        setup_data = setup_response.json()
        assert "secret" in setup_data
        assert "qr_code" in setup_data
        assert "backup_codes" in setup_data
        assert len(setup_data["backup_codes"]) == 10


@pytest.mark.anyio
async def test_2fa_enable_and_verify(db, fake_redis):
    """Test enabling 2FA with valid code"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login
        patient_data = {
            "email": "patient_2fa_enable@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_2fa_enable@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Setup 2FA
        setup_response = await client.post(
            "/api/v1/2fa/setup",
            headers={"Authorization": f"Bearer {token}"},
        )
        secret = setup_response.json()["secret"]

        # Generate valid TOTP code
        totp = pyotp.TOTP(secret)
        code = totp.now()

        # Enable 2FA
        enable_response = await client.post(
            "/api/v1/2fa/enable",
            json={"code": code},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert enable_response.status_code == 200

        # Check status
        status_response = await client.get(
            "/api/v1/2fa/status",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert status_response.json()["enabled"] is True


@pytest.mark.anyio
async def test_2fa_verify_with_backup_code(db, fake_redis):
    """Test verifying 2FA with backup code"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login
        patient_data = {
            "email": "patient_2fa_backup@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_2fa_backup@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Setup and enable 2FA
        setup_response = await client.post(
            "/api/v1/2fa/setup",
            headers={"Authorization": f"Bearer {token}"},
        )
        secret = setup_response.json()["secret"]
        backup_codes = setup_response.json()["backup_codes"]

        totp = pyotp.TOTP(secret)
        code = totp.now()

        await client.post(
            "/api/v1/2fa/enable",
            json={"code": code},
            headers={"Authorization": f"Bearer {token}"},
        )

        # Verify with backup code
        verify_response = await client.post(
            "/api/v1/2fa/verify",
            json={"code": backup_codes[0]},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert verify_response.status_code == 200


@pytest.mark.anyio
async def test_2fa_disable(db, fake_redis):
    """Test disabling 2FA"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login
        patient_data = {
            "email": "patient_2fa_disable@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_2fa_disable@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Setup and enable 2FA
        setup_response = await client.post(
            "/api/v1/2fa/setup",
            headers={"Authorization": f"Bearer {token}"},
        )
        secret = setup_response.json()["secret"]

        totp = pyotp.TOTP(secret)
        code = totp.now()

        await client.post(
            "/api/v1/2fa/enable",
            json={"code": code},
            headers={"Authorization": f"Bearer {token}"},
        )

        # Generate new code for disable
        code = totp.now()

        # Disable 2FA
        disable_response = await client.delete(
            "/api/v1/2fa/disable",
            json={"code": code},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert disable_response.status_code == 200

        # Check status
        status_response = await client.get(
            "/api/v1/2fa/status",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert status_response.json()["enabled"] is False


@pytest.mark.anyio
async def test_2fa_invalid_code(db, fake_redis):
    """Test that invalid code is rejected"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login
        patient_data = {
            "email": "patient_2fa_invalid@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_2fa_invalid@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Setup 2FA
        await client.post(
            "/api/v1/2fa/setup",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Try to enable with invalid code
        enable_response = await client.post(
            "/api/v1/2fa/enable",
            json={"code": "000000"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert enable_response.status_code == 400
