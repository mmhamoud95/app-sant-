import pytest
from httpx import AsyncClient
from app.main import app
from app.db.models import User, Patient, Doctor, Message
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
async def test_create_message(db, fake_redis):
    """Test creating a message between two users"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register two users
        patient_data = {
            "email": "patient_msg@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        doctor_data = {
            "email": "doctor_msg@test.com",
            "password": "TestPassword123!",
            "first_name": "Jane",
            "last_name": "Smith",
            "clinic_name": "Test Clinic",
            "specialties": ["general"],
            "languages": ["en"],
        }
        await client.post("/api/v1/auth/doctor/register", json=doctor_data)

        # Login as patient
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_msg@test.com", "password": "TestPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Get doctor's user_id
        doctor_user = db.query(User).filter(User.email == "doctor_msg@test.com").first()
        assert doctor_user is not None

        # Create message
        message_data = {
            "receiver_id": doctor_user.id,
            "content": "Hello Doctor!",
        }
        create_response = await client.post(
            "/api/v1/messages/",
            json=message_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        message = create_response.json()
        assert message["content"] == "Hello Doctor!"
        assert message["receiver_id"] == doctor_user.id


@pytest.mark.anyio
async def test_get_conversations(db, fake_redis):
    """Test getting conversations list"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login as patient
        patient_data = {
            "email": "patient_conv@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_conv@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Get conversations (should be empty initially)
        conv_response = await client.get(
            "/api/v1/messages/conversations",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert conv_response.status_code == 200
        assert isinstance(conv_response.json(), list)


@pytest.mark.anyio
async def test_get_messages_with_user(db, fake_redis):
    """Test getting messages between two users"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register two users
        patient_data = {
            "email": "patient_history@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        doctor_data = {
            "email": "doctor_history@test.com",
            "password": "TestPassword123!",
            "first_name": "Jane",
            "last_name": "Smith",
            "clinic_name": "Test Clinic",
            "specialties": ["general"],
            "languages": ["en"],
        }
        await client.post("/api/v1/auth/doctor/register", json=doctor_data)

        # Login as patient
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_history@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        # Get doctor's user_id
        doctor_user = db.query(User).filter(User.email == "doctor_history@test.com").first()

        # Create a message
        message_data = {
            "receiver_id": doctor_user.id,
            "content": "Test message",
        }
        await client.post(
            "/api/v1/messages/",
            json=message_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        # Get messages with doctor
        messages_response = await client.get(
            f"/api/v1/messages/{doctor_user.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert messages_response.status_code == 200
        messages = messages_response.json()
        assert len(messages) == 1
        assert messages[0]["content"] == "Test message"


@pytest.mark.anyio
async def test_delete_message(db, fake_redis):
    """Test deleting a message"""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # Register and login
        patient_data = {
            "email": "patient_del@test.com",
            "password": "TestPassword123!",
            "first_name": "John",
            "last_name": "Doe",
        }
        await client.post("/api/v1/auth/patient/register", json=patient_data)

        doctor_data = {
            "email": "doctor_del@test.com",
            "password": "TestPassword123!",
            "first_name": "Jane",
            "last_name": "Smith",
            "clinic_name": "Test Clinic",
            "specialties": ["general"],
            "languages": ["en"],
        }
        await client.post("/api/v1/auth/doctor/register", json=doctor_data)

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "patient_del@test.com", "password": "TestPassword123!"},
        )
        token = login_response.json()["access_token"]

        doctor_user = db.query(User).filter(User.email == "doctor_del@test.com").first()

        # Create message
        message_data = {
            "receiver_id": doctor_user.id,
            "content": "To be deleted",
        }
        create_response = await client.post(
            "/api/v1/messages/",
            json=message_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        message_id = create_response.json()["id"]

        # Delete message
        delete_response = await client.delete(
            f"/api/v1/messages/{message_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert delete_response.status_code == 204
