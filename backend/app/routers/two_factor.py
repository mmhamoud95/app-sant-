from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import pyotp
import qrcode
import io
import base64
import secrets

from app.auth.dependencies import get_current_user
from app.db.models import User, TwoFactorAuth
from app.db.session import get_db
from app.schemas.two_factor import (
    TwoFactorSetupResponse,
    TwoFactorEnableRequest,
    TwoFactorVerifyRequest,
    TwoFactorStatusResponse,
)

router = APIRouter(prefix="/2fa", tags=["two-factor-auth"])


def generate_backup_codes(count: int = 10) -> list[str]:
    """Generate backup codes for 2FA"""
    return [secrets.token_hex(4).upper() for _ in range(count)]


@router.get("/status", response_model=TwoFactorStatusResponse)
def get_2fa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get 2FA status for current user"""
    two_factor = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user.id).first()
    return TwoFactorStatusResponse(enabled=two_factor.enabled if two_factor else False)


@router.post("/setup", response_model=TwoFactorSetupResponse)
def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Setup 2FA for current user"""
    # Check if 2FA already exists
    two_factor = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user.id).first()
    if two_factor and two_factor.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled",
        )

    # Generate secret
    secret = pyotp.random_base32()

    # Generate backup codes
    backup_codes = generate_backup_codes()
    backup_codes_str = ",".join(backup_codes)

    # Create or update 2FA record
    if two_factor:
        two_factor.secret = secret
        two_factor.backup_codes = backup_codes_str
        two_factor.enabled = False
    else:
        two_factor = TwoFactorAuth(
            user_id=current_user.id,
            secret=secret,
            backup_codes=backup_codes_str,
            enabled=False,
        )
        db.add(two_factor)

    db.commit()
    db.refresh(two_factor)

    # Generate QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="App Sante",
    )

    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()

    return TwoFactorSetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{qr_code_base64}",
        backup_codes=backup_codes,
    )


@router.post("/enable", status_code=status.HTTP_200_OK)
def enable_2fa(
    request: TwoFactorEnableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enable 2FA after verifying code"""
    two_factor = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user.id).first()
    if not two_factor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not setup. Please setup first.",
        )

    if two_factor.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled",
        )

    # Verify code
    totp = pyotp.TOTP(two_factor.secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    # Enable 2FA
    two_factor.enabled = True
    db.commit()

    return {"message": "2FA enabled successfully"}


@router.post("/verify", status_code=status.HTTP_200_OK)
def verify_2fa(
    request: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify 2FA code"""
    two_factor = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user.id).first()
    if not two_factor or not two_factor.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled",
        )

    # Check if it's a backup code
    if two_factor.backup_codes:
        backup_codes = two_factor.backup_codes.split(",")
        if request.code in backup_codes:
            # Remove used backup code
            backup_codes.remove(request.code)
            two_factor.backup_codes = ",".join(backup_codes)
            db.commit()
            return {"message": "Valid backup code"}

    # Verify TOTP code
    totp = pyotp.TOTP(two_factor.secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    return {"message": "Valid verification code"}


@router.delete("/disable", status_code=status.HTTP_200_OK)
def disable_2fa(
    request: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable 2FA after verifying code"""
    two_factor = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user.id).first()
    if not two_factor or not two_factor.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled",
        )

    # Verify code
    totp = pyotp.TOTP(two_factor.secret)
    if not totp.verify(request.code, valid_window=1):
        # Check backup codes
        if two_factor.backup_codes:
            backup_codes = two_factor.backup_codes.split(",")
            if request.code not in backup_codes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification code",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code",
            )

    # Disable 2FA
    two_factor.enabled = False
    db.commit()

    return {"message": "2FA disabled successfully"}
