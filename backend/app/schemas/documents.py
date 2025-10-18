from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MedicalDocumentCreate(BaseModel):
    doctor_id: Optional[int] = None
    type: str
    title: str


class MedicalDocumentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int] = None
    type: str
    title: str
    file_url: str
    file_size: int
    mime_type: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
