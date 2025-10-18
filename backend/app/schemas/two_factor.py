from pydantic import BaseModel
from typing import Optional


class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: list[str]


class TwoFactorEnableRequest(BaseModel):
    code: str


class TwoFactorVerifyRequest(BaseModel):
    code: str


class TwoFactorStatusResponse(BaseModel):
    enabled: bool
