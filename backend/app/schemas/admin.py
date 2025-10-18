from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class AdminDoctorSummary(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    verified: bool
    clinic_name: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    created_at: datetime


class AdminDoctorListResponse(BaseModel):
    items: list[AdminDoctorSummary]
    total: int
    page: int
    limit: int


class DoctorVerificationRequest(BaseModel):
    verified: bool = True
    note: Optional[str] = Field(default=None, max_length=500)


class DoctorVerificationResponse(AdminDoctorSummary):
    note: Optional[str] = None


class CancellationSummary(BaseModel):
    id: int
    name: str
    cancellation_count: int


class AdminStatsResponse(BaseModel):
    total_patients: int
    total_doctors: int
    verified_doctors: int
    pending_doctors: int
    total_appointments: int
    cancelled_appointments: int
    patient_cancellations: list[CancellationSummary]
    doctor_cancellations: list[CancellationSummary]
