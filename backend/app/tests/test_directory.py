from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.db.models import Doctor, Slot, SlotStatus

client = TestClient(app)


def _create_doctor(email: str, specialty: str, city: str, language: str, days_ahead: int = 1) -> int:
    payload = {
        "email": email,
        "password": "SuperSecurePass1",
        "first_name": "Alice",
        "last_name": "Martin",
        "phone": "+33123456789",
        "bio": "Experienced specialist",
        "clinic_name": "City Clinic",
        "clinic_city": city,
        "clinic_country": "France",
        "specialties": [specialty],
        "languages": [language],
    }
    resp = client.post("/api/v1/auth/doctor/register", json=payload)
    assert resp.status_code == 201
    doctor_id = resp.json()["id"]

    with SessionLocal() as db:
        doctor = db.query(Doctor).filter(Doctor.user_id == doctor_id).first()
        assert doctor is not None
        doctor.verified = True
        start_time = datetime.utcnow() + timedelta(days=days_ahead)
        slot = Slot(
            doctor_id=doctor_id,
            start_time=start_time,
            end_time=start_time + timedelta(minutes=30),
            status=SlotStatus.free,
        )
        db.add(slot)
        db.commit()

    return doctor_id


def test_specialties_endpoint_returns_seeded_values():
    resp = client.get("/api/v1/specialties")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(item["slug"] == "cardiology" for item in data)


def test_doctor_search_filters_on_specialty_city_language_date():
    doctor_id = _create_doctor("doc1@example.com", "cardiology", "Paris", "fr", days_ahead=2)
    query_params = {
        "specialty": "cardiology",
        "city": "Paris",
        "language": "fr",
        "date": (datetime.utcnow() + timedelta(days=2)).date().isoformat(),
    }
    resp = client.get("/api/v1/doctors", params=query_params)
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["total"] >= 1
    doctor_ids = [item["id"] for item in payload["items"]]
    assert doctor_id in doctor_ids


def test_doctor_detail_returns_slots():
    doctor_id = _create_doctor("doc2@example.com", "dermatology", "Lyon", "en", days_ahead=1)
    resp = client.get(f"/api/v1/doctors/{doctor_id}")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["id"] == doctor_id
    assert isinstance(payload.get("slots"), list)
    assert len(payload["slots"]) >= 1
