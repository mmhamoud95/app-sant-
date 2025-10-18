from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class FamilyProfileCreate(BaseModel):
    first_name: str
    last_name: str
    relationship_type: str
    date_of_birth: date


class FamilyProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    relationship_type: Optional[str] = None
    date_of_birth: Optional[date] = None


class FamilyProfileResponse(BaseModel):
    id: int
    patient_id: int
    first_name: str
    last_name: str
    relationship_type: str
    date_of_birth: date
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
