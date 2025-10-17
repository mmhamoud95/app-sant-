from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


class PatientProfileResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    preferred_language: Optional[str] = Field(default=None, max_length=10)

    @classmethod
    def from_model(cls, patient) -> "PatientProfileResponse":
        user = patient.user
        return cls(
            id=patient.user_id,
            email=user.email,
            first_name=patient.first_name,
            last_name=patient.last_name,
            phone=patient.phone,
            preferred_language=patient.preferred_language,
        )


class PatientProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    preferred_language: Optional[str] = Field(default=None, min_length=2, max_length=10)

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> "PatientProfileUpdate":
        if not any(
            value is not None
            for value in (
                self.first_name,
                self.last_name,
                self.phone,
                self.preferred_language,
            )
        ):
            raise ValueError("At least one field must be provided")
        return self
