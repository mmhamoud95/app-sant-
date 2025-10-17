from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.db.models import AppointmentStatus, SlotStatus


class AppointmentSlotResponse(BaseModel):
    id: int
    start_time: datetime
    end_time: datetime
    status: SlotStatus


class AppointmentDoctorSummary(BaseModel):
    id: int
    first_name: str
    last_name: str
    clinic_name: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    status: AppointmentStatus
    reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    cancelled_at: Optional[datetime] = None
    doctor: AppointmentDoctorSummary
    slot: AppointmentSlotResponse


class AppointmentListResponse(BaseModel):
    items: list[AppointmentResponse]
    total: int
    page: int
    limit: int


class AppointmentCreateRequest(BaseModel):
    doctor_id: int
    slot_id: int
    reason: Optional[str] = Field(default=None, max_length=500)


class AppointmentRescheduleRequest(BaseModel):
    slot_id: int


class AppointmentCancelRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)