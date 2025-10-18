import pytest
from httpx import AsyncClient
from app.main import app
from app.db.session import SessionLocal
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
async def test_create_family_profile(db, fake_redis):
    """Test creating a family profile"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login as patient
        patient_data = {
            "email": "patient_family@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_family@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Create family profile
        profile_data = {
            "first_name": "Jane",
            "last_name": "Doe",
            "relationship_type": "Conjoint(e)",
            "date_of_birth": "1990-05-15",
        }
        create_response = await client.post(
            "/api/v1/family/",
            json=profile_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        profile = create_response.json()
        assert profile["first_name"] == "Jane"
        assert profile["relationship_type"] == "Conjoint(e)"


@pytest.mark.anyio
async def test_get_family_profiles(db, fake_redis):
    """Test getting all family profiles"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login
        patient_data = {
            "email": "patient_list@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_list@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Create family profile
        profile_data = {
            "first_name": "Jane",
            "last_name": "Doe",
            "relationship_type": "Conjoint(e)",
            "date_of_birth": "1990-05-15",
        }
        await client.post(
            "/api/v1/family/",
            json=profile_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        # Get all profiles
        get_response = await client.get(
            "/api/v1/family/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_response.status_code == 200
        profiles = get_response.json()
        assert len(profiles) == 1
        assert profiles[0]["first_name"] == "Jane"


@pytest.mark.anyio
async def test_update_family_profile(db, fake_redis):
    """Test updating a family profile"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login
        patient_data = {
            "email": "patient_update@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_update@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Create family profile
        profile_data = {
            "first_name": "Jane",
            "last_name": "Doe",
            "relationship_type": "Conjoint(e)",
            "date_of_birth": "1990-05-15",
        }
        create_response = await client.post(
            "/api/v1/family/",
            json=profile_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        profile_id = create_response.json()["id"]

        # Update profile
        update_data = {"first_name": "Janet"}
        update_response = await client.put(
            f"/api/v1/family/{profile_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert update_response.status_code == 200
        updated_profile = update_response.json()
        assert updated_profile["first_name"] == "Janet"


@pytest.mark.anyio
async def test_delete_family_profile(db, fake_redis):
    """Test deleting a family profile"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login
        patient_data = {
            "email": "patient_delete@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_delete@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Create family profile
        profile_data = {
            "first_name": "Jane",
            "last_name": "Doe",
            "relationship_type": "Conjoint(e)",
            "date_of_birth": "1990-05-15",
        }
        create_response = await client.post(
            "/api/v1/family/",
            json=profile_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        profile_id = create_response.json()["id"]

        # Delete profile
        delete_response = await client.delete(
            f"/api/v1/family/{profile_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert delete_response.status_code == 204

        # Verify deletion
        get_response = await client.get(
            f"/api/v1/family/{profile_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_response.status_code == 404


@pytest.mark.anyio
async def test_doctor_cannot_create_family_profile(db, fake_redis):
    """Test that doctors cannot create family profiles"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login as doctor
        doctor_data = {
            "email": "doctor_family@test.com",
            "password": "TestPassword123!",
            "first_name": "Jane",
            "last_name": "Smith",
            "clinic_name": "Test Clinic",
            "specialties": ["general"],
            "languages": ["en"],
        }
        await client.post("/api/v1/auth/doctor/register", json=doctor_data)

        # Verify doctor first as admin
        admin_data = {
            "email": "admin_family@test.com",
            "password": "AdminPassword123!",
            "admin_secret": "change-this-admin-secret-in-prod",
        }
        await client.post("/api/v1/auth/admin/register", json=admin_data)
        
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin_family@test.com", "password": "AdminPassword123!"},
        )
        admin_token = admin_login.json()["access_token"]

        # Get doctor user_id and verify
        from app.db.models import User
        doctor_user = db.query(User).filter(User.email == "doctor_family@test.com").first()
        await client.post(
            f"/api/v1/admin/verify-doctor/{doctor_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        db.refresh(doctor_user.doctor)

        # Now login as verified doctor
        doctor_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "doctor_family@test.com", "password": "TestPassword123!"},
        )
        doctor_token = doctor_login.json()["access_token"]

        # Try to create family profile as doctor
        profile_data = {
            "first_name": "Test",
            "last_name": "Family",
            "relationship_type": "Enfant",
            "date_of_birth": "2010-01-01",
        }
        create_response = await client.post(
            "/api/v1/family/",
            json=profile_data,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert create_response.status_code == 403
