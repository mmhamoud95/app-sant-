from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class RegisterPatientRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12)
    first_name: str
    last_name: str
    phone: Optional[str] = None
    preferred_language: Optional[str] = None


class RegisterDoctorRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12)
    first_name: str
    last_name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_city: Optional[str] = None
    clinic_region: Optional[str] = None
    clinic_country: Optional[str] = None
    specialties: list[str] = Field(default_factory=list, description="List of specialty slugs")
    languages: list[str] = Field(default_factory=list, description="List of language codes")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: int
    email: str
    role: str

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    message: str
