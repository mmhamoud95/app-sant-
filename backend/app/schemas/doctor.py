from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class DoctorProfileResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    verified: bool
    clinic_name: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    specialties: list[str] = []
    languages: list[str] = []

    class Config:
        from_attributes = True


class DoctorProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None


class AppointmentPatientSummary(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: Optional[str] = None


class DoctorAppointmentResponse(BaseModel):
    id: int
    status: str
    reason: Optional[str] = None
    created_at: str
    patient: AppointmentPatientSummary
    slot: dict
