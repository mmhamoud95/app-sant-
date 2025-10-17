import datetime as dt
from datetime import time
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class AvailabilityRuleResponse(BaseModel):
    id: str
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    slot_minutes: int


class AvailabilityExceptionResponse(BaseModel):
    id: str
    date: dt.date
    is_closed: bool
    reason: Optional[str] = None


class DoctorAvailabilityResponse(BaseModel):
    rules: list[AvailabilityRuleResponse]
    exceptions: list[AvailabilityExceptionResponse]


class AvailabilityRuleCreate(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    slot_minutes: int = Field(gt=0, le=480)

    @model_validator(mode="after")
    def validate_rule(self) -> "AvailabilityRuleCreate":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be earlier than end_time")
        total_minutes = int((
            (self.end_time.hour * 60 + self.end_time.minute)
            - (self.start_time.hour * 60 + self.start_time.minute)
        ))
        if self.slot_minutes not in {10, 15, 20, 30, 45, 60, 90, 120}:
            raise ValueError("slot_minutes must be one of 10, 15, 20, 30, 45, 60, 90, 120")
        if total_minutes % self.slot_minutes != 0:
            raise ValueError("slot_minutes must evenly divide the rule duration")
        return self


class AvailabilityExceptionCreate(BaseModel):
    date: dt.date
    is_closed: bool = True
    reason: Optional[str] = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_exception(self) -> "AvailabilityExceptionCreate":
        if self.date < dt.date.today():
            raise ValueError("date must not be in the past")
        return self


class DoctorAvailabilityCreateRequest(BaseModel):
    kind: Literal["rule", "exception"]
    rule: Optional[AvailabilityRuleCreate] = None
    exception: Optional[AvailabilityExceptionCreate] = None

    @model_validator(mode="after")
    def validate_payload(self) -> "DoctorAvailabilityCreateRequest":
        if self.kind == "rule" and not self.rule:
            raise ValueError("rule payload required when kind is 'rule'")
        if self.kind == "exception" and not self.exception:
            raise ValueError("exception payload required when kind is 'exception'")
        return self


class AvailabilityEntryResponse(BaseModel):
    id: str
    kind: Literal["rule", "exception"]
    weekday: Optional[int] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_minutes: Optional[int] = None
    date: Optional[dt.date] = None
    is_closed: Optional[bool] = None
    reason: Optional[str] = None