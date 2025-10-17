from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class SpecialtyResponse(BaseModel):
    id: int
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


class LanguageResponse(BaseModel):
    id: int
    code: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class ClinicResponse(BaseModel):
    id: int
    name: str
    city: Optional[str]
    region: Optional[str]
    country: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class SlotResponse(BaseModel):
    id: int
    start_time: datetime
    end_time: datetime

    model_config = ConfigDict(from_attributes=True)


class DoctorSummary(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    city: Optional[str]
    region: Optional[str]
    country: Optional[str]
    verified: bool
    specialties: List[SpecialtyResponse]
    languages: List[LanguageResponse]

    model_config = ConfigDict(from_attributes=True)


class DoctorDetail(DoctorSummary):
    bio: Optional[str]
    clinic: Optional[ClinicResponse]
    slots: List[SlotResponse]


class PaginatedDoctorResponse(BaseModel):
    items: List[DoctorSummary]
    page: int
    limit: int
    total: int
