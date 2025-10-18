from datetime import datetime, date as dt_date, time as dt_time
from typing import Optional
from enum import Enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    Time,
    Enum as PgEnum,
    ForeignKey,
    Table,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base


class UserRole(str, Enum):
    patient = "patient"
    doctor = "doctor"
    admin = "admin"


class User(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(PgEnum(UserRole, name="userrole"), nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="user", uselist=False)
    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="user", uselist=False)
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    two_factor_auth: Mapped["TwoFactorAuth"] = relationship(
        "TwoFactorAuth",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Patient(Base):
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="patient")
    appointments: Mapped[list["Appointment"]] = relationship(
        "Appointment",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    medical_documents: Mapped[list["MedicalDocument"]] = relationship(
        "MedicalDocument",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    family_profiles: Mapped[list["FamilyProfile"]] = relationship(
        "FamilyProfile",
        back_populates="patient",
        cascade="all, delete-orphan",
    )


doctor_specialty_table = Table(
    "doctor_specialty",
    Base.metadata,
    Column("doctor_id", ForeignKey("doctor.user_id"), primary_key=True),
    Column("specialty_id", ForeignKey("specialty.id"), primary_key=True),
)

doctor_language_table = Table(
    "doctor_language",
    Base.metadata,
    Column("doctor_id", ForeignKey("doctor.user_id"), primary_key=True),
    Column("language_id", ForeignKey("language.id"), primary_key=True),
)


class Clinic(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    doctors: Mapped[list["Doctor"]] = relationship("Doctor", back_populates="clinic")


class Specialty(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)

    doctors: Mapped[list["Doctor"]] = relationship(
        "Doctor",
        secondary=doctor_specialty_table,
        back_populates="specialties",
    )


class Language(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)

    doctors: Mapped[list["Doctor"]] = relationship(
        "Doctor",
        secondary=doctor_language_table,
        back_populates="languages",
    )


class Doctor(Base):
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    clinic_id: Mapped[int | None] = mapped_column(ForeignKey("clinic.id"), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    country: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="doctor")
    clinic: Mapped[Clinic | None] = relationship("Clinic", back_populates="doctors")
    specialties: Mapped[list[Specialty]] = relationship(
        "Specialty",
        secondary=doctor_specialty_table,
        back_populates="doctors",
    )
    languages: Mapped[list[Language]] = relationship(
        "Language",
        secondary=doctor_language_table,
        back_populates="doctors",
    )
    slots: Mapped[list["Slot"]] = relationship("Slot", back_populates="doctor", cascade="all, delete-orphan")
    availability_rules: Mapped[list["AvailabilityRule"]] = relationship(
        "AvailabilityRule",
        back_populates="doctor",
        cascade="all, delete-orphan",
        order_by="AvailabilityRule.weekday",
    )
    availability_exceptions: Mapped[list["AvailabilityException"]] = relationship(
        "AvailabilityException",
        back_populates="doctor",
        cascade="all, delete-orphan",
        order_by="AvailabilityException.date",
    )
    appointments: Mapped[list["Appointment"]] = relationship(
        "Appointment",
        back_populates="doctor",
        cascade="all, delete-orphan",
    )
    medical_documents: Mapped[list["MedicalDocument"]] = relationship(
        "MedicalDocument",
        back_populates="doctor",
        cascade="all, delete-orphan",
    )


class SlotStatus(str, Enum):
    free = "free"
    reserved = "reserved"
    blocked = "blocked"


class Slot(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctor.user_id"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[SlotStatus] = mapped_column(PgEnum(SlotStatus, name="slotstatus"), default=SlotStatus.free, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    doctor: Mapped[Doctor] = relationship("Doctor", back_populates="slots")
    appointment: Mapped[Optional["Appointment"]] = relationship(
        "Appointment",
        back_populates="slot",
        uselist=False,
    )

    __table_args__ = (
        UniqueConstraint("doctor_id", "start_time", name="uq_slot_doctor_start"),
    )


class AppointmentStatus(str, Enum):
    booked = "booked"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class Appointment(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.user_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctor.user_id"), nullable=False, index=True)
    slot_id: Mapped[int] = mapped_column(ForeignKey("slot.id"), nullable=False, unique=True)
    status: Mapped[AppointmentStatus] = mapped_column(PgEnum(AppointmentStatus, name="appointmentstatus"), nullable=False, default=AppointmentStatus.booked)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    patient: Mapped[Patient] = relationship("Patient", back_populates="appointments")
    doctor: Mapped[Doctor] = relationship("Doctor", back_populates="appointments")
    slot: Mapped[Slot] = relationship("Slot", back_populates="appointment")
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="appointment",
        cascade="all, delete-orphan",
    )


class NotificationStatus(str, Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class Notification(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False, index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointment.id"), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(120), nullable=False)
    payload_json: Mapped[dict | None] = mapped_column("payload", JSON, nullable=True)
    status: Mapped[NotificationStatus] = mapped_column(
        PgEnum(NotificationStatus, name="notificationstatus"),
        nullable=False,
        default=NotificationStatus.pending,
    )
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="notifications")
    appointment: Mapped[Optional[Appointment]] = relationship("Appointment", back_populates="notifications")


class RefreshToken(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")


class AuditLog(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    resource: Mapped[str] = mapped_column(String(120), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User | None] = relationship("User")


class AvailabilityRule(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctor.user_id"), nullable=False, index=True)
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[dt_time] = mapped_column(Time, nullable=False)
    end_time: Mapped[dt_time] = mapped_column(Time, nullable=False)
    slot_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    doctor: Mapped[Doctor] = relationship("Doctor", back_populates="availability_rules")

    __table_args__ = (
        UniqueConstraint("doctor_id", "weekday", "start_time", "end_time", name="uq_availability_rule_window"),
    )


class AvailabilityException(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctor.user_id"), nullable=False, index=True)
    date: Mapped[dt_date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    doctor: Mapped[Doctor] = relationship("Doctor", back_populates="availability_exceptions")

    __table_args__ = (
        UniqueConstraint("doctor_id", "date", name="uq_availability_exception_date"),
    )


class Message(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False, index=True)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(String(2000), nullable=False)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sender: Mapped[User] = relationship("User", foreign_keys=[sender_id])
    receiver: Mapped[User] = relationship("User", foreign_keys=[receiver_id])


class DocumentType(str, Enum):
    prescription = "prescription"
    test_result = "test_result"
    certificate = "certificate"
    report = "report"


class MedicalDocument(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.user_id"), nullable=False, index=True)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctor.user_id"), nullable=True, index=True)
    type: Mapped[DocumentType] = mapped_column(PgEnum(DocumentType, name="documenttype"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    patient: Mapped[Patient] = relationship("Patient", back_populates="medical_documents")
    doctor: Mapped[Doctor | None] = relationship("Doctor", back_populates="medical_documents")


class FamilyProfile(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.user_id"), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    relationship_type: Mapped[str] = mapped_column("relationship", String(50), nullable=False)
    date_of_birth: Mapped[dt_date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    patient: Mapped[Patient] = relationship("Patient", back_populates="family_profiles")


class TwoFactorAuth(Base):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False, unique=True, index=True)
    secret: Mapped[str] = mapped_column(String(255), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    backup_codes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="two_factor_auth")
