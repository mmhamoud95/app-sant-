from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.schemas import (
    LoginRequest,
    MessageResponse,
    RegisterDoctorRequest,
    RegisterPatientRequest,
    TokenResponse,
    UserResponse,
)
from app.auth.utils import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.config import settings
from app.db.models import (
    Clinic,
    Doctor,
    Language,
    Patient,
    RefreshToken,
    Specialty,
    User,
    UserRole,
)
from app.db.session import get_db
from app.infra.redis_client import get_redis_client
from app.services.rate_limiter import rate_limit_login_attempt
from app.services.audit import log_audit_event

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_BLACKLIST_PREFIX = "auth:refresh:blacklist:"


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _refresh_cookie_max_age(expires_at: datetime) -> int:
    expires_utc = _to_utc(expires_at)
    ttl = int((expires_utc - datetime.now(timezone.utc)).total_seconds())
    return max(ttl, 60)


def _set_refresh_cookie(response: Response, token: str, expires_at: datetime) -> None:
    expires_utc = _to_utc(expires_at)
    response.set_cookie(
        key=settings.refresh_token_cookie_name,
        value=token,
        httponly=True,
        secure=settings.refresh_token_cookie_secure,
        samesite=settings.refresh_token_cookie_same_site,
        domain=settings.refresh_token_cookie_domain,
        path=settings.refresh_token_cookie_path,
        max_age=_refresh_cookie_max_age(expires_utc),
        expires=expires_utc,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.refresh_token_cookie_name,
        path=settings.refresh_token_cookie_path,
        domain=settings.refresh_token_cookie_domain,
    )


def _blacklist_refresh_token(token_hash: str, expires_at: datetime) -> None:
    ttl = _refresh_cookie_max_age(expires_at)
    client = get_redis_client()
    client.setex(f"{REFRESH_BLACKLIST_PREFIX}{token_hash}", ttl, "1")


def _is_refresh_token_blacklisted(token_hash: str) -> bool:
    client = get_redis_client()
    return client.exists(f"{REFRESH_BLACKLIST_PREFIX}{token_hash}") == 1


def _revoke_tokens(tokens: List[RefreshToken]) -> bool:
    updated = False
    now = datetime.now(timezone.utc)
    for token in tokens:
        if token.revoked:
            continue
        token.revoked = True
        updated = True
        expires_at = token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at > now:
            _blacklist_refresh_token(token.token_hash, expires_at)
    return updated


def _revoke_user_refresh_tokens(db: Session, user_id: int) -> bool:
    tokens = (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False))
        .all()
    )
    return _revoke_tokens(tokens)


@router.post("/patient/register", response_model=UserResponse, status_code=201)
def register_patient(
    req: RegisterPatientRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    # Check if email already exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        log_audit_event(
            db,
            action="auth.register.patient.failed",
            resource="auth",
            request=request,
            metadata={"email": req.email, "reason": "email_exists"},
            use_separate_session=True,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # Create user
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=UserRole.patient,
    )
    db.add(user)
    db.flush()
    
    # Create patient profile
    patient = Patient(
        user_id=user.id,
        first_name=req.first_name,
        last_name=req.last_name,
        phone=req.phone,
        preferred_language=req.preferred_language,
    )
    db.add(patient)
    db.commit()
    db.refresh(user)
    
    log_audit_event(
        db,
        action="auth.register.patient.success",
        resource="auth",
        request=request,
        user_id=user.id,
        metadata={"patient_id": patient.user_id},
        use_separate_session=True,
    )

    return UserResponse.model_validate(user)


@router.post("/doctor/register", response_model=UserResponse, status_code=201)
def register_doctor(
    req: RegisterDoctorRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> UserResponse:
    # Check if email already exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        log_audit_event(
            db,
            action="auth.register.doctor.failed",
            resource="auth",
            request=request,
            metadata={"email": req.email, "reason": "email_exists"},
            use_separate_session=True,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # Create user
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=UserRole.doctor,
    )
    db.add(user)
    db.flush()
    
    clinic = None
    if req.clinic_name:
        normalized_clinic_name = req.clinic_name.strip()
        clinic = (
            db.query(Clinic)
            .filter(Clinic.name == normalized_clinic_name)
            .first()
        )
        if not clinic:
            clinic = Clinic(
                name=normalized_clinic_name,
                city=req.clinic_city,
                region=req.clinic_region,
                country=req.clinic_country,
                phone=req.phone,
            )
            db.add(clinic)
            db.flush()

    # Create doctor profile (not verified)
    doctor = Doctor(
        user_id=user.id,
        first_name=req.first_name,
        last_name=req.last_name,
        phone=req.phone,
        bio=req.bio,
        verified=False,
        clinic_id=clinic.id if clinic else None,
        city=req.clinic_city,
        region=req.clinic_region,
        country=req.clinic_country,
    )
    db.add(doctor)

    if req.specialties:
        specialties: list[Specialty] = []
        for slug in req.specialties:
            normalized_slug = slug.strip().lower()
            if not normalized_slug:
                continue
            specialty = (
                db.query(Specialty)
                .filter(Specialty.slug == normalized_slug)
                .first()
            )
            if not specialty:
                specialty = Specialty(
                    name=normalized_slug.replace('-', ' ').title(),
                    slug=normalized_slug,
                )
                db.add(specialty)
                db.flush()
            specialties.append(specialty)
        doctor.specialties = specialties

    if req.languages:
        languages: list[Language] = []
        for code in req.languages:
            normalized_code = code.strip().lower()
            if not normalized_code:
                continue
            language = (
                db.query(Language)
                .filter(Language.code == normalized_code)
                .first()
            )
            if not language:
                language = Language(
                    code=normalized_code,
                    name=normalized_code.upper(),
                )
                db.add(language)
                db.flush()
            languages.append(language)
        doctor.languages = languages

    db.commit()
    db.refresh(user)
    
    log_audit_event(
        db,
        action="auth.register.doctor.success",
        resource="auth",
        request=request,
        user_id=user.id,
        metadata={
            "doctor_id": doctor.user_id,
            "clinic_id": clinic.id if clinic else None,
            "specialty_slugs": req.specialties,
            "language_codes": req.languages,
        },
        use_separate_session=True,
    )

    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(
    req: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    client_ip = request.client.host if request.client else None
    rate_limit_login_attempt(client_ip, req.email)

    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        log_audit_event(
            db,
            action="auth.login.failed",
            resource="auth",
            request=request,
            user_id=user.id if user else None,
            metadata={"email": req.email, "reason": "invalid_credentials"},
            use_separate_session=True,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.role == UserRole.doctor:
        doctor = user.doctor
        doctor_verified = bool(doctor.verified) if doctor else False
        if not doctor_verified:
            log_audit_event(
                db,
                action="auth.login.failed",
                resource="auth",
                request=request,
                user_id=user.id,
                metadata={
                    "email": req.email,
                    "reason": "doctor_not_verified",
                    "doctor_verified": doctor_verified,
                },
                use_separate_session=True,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctor account pending verification",
            )

    if _revoke_user_refresh_tokens(db, user.id):
        db.flush()

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_plain, refresh_hash, expires_at = generate_refresh_token()
    refresh_entry = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(refresh_entry)
    db.commit()

    _set_refresh_cookie(response, refresh_plain, expires_at)

    log_audit_event(
        db,
        action="auth.login.success",
        resource="auth",
        request=request,
        user_id=user.id,
        metadata={"refresh_token_id": refresh_entry.id},
        use_separate_session=True,
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.access_token_exp_minutes * 60,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    raw_token = request.cookies.get(settings.refresh_token_cookie_name)
    if not raw_token:
        log_audit_event(
            db,
            action="auth.refresh.failed",
            resource="auth",
            request=request,
            metadata={"reason": "missing_token"},
            use_separate_session=True,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    token_hash_value = hash_token(raw_token)
    token_record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash_value).first()
    if not token_record or token_record.revoked:
        _clear_refresh_cookie(response)
        log_audit_event(
            db,
            action="auth.refresh.failed",
            resource="auth",
            request=request,
            user_id=token_record.user_id if token_record else None,
            metadata={
                "reason": "revoked_or_missing",
                "revoked": bool(token_record.revoked) if token_record else None,
            },
            use_separate_session=True,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    expires_utc = _to_utc(token_record.expires_at)
    if expires_utc <= datetime.now(timezone.utc):
        token_record.revoked = True
        db.commit()
        _clear_refresh_cookie(response)
        log_audit_event(
            db,
            action="auth.refresh.failed",
            resource="auth",
            request=request,
            user_id=token_record.user_id,
            metadata={"reason": "expired"},
            use_separate_session=True,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    if _is_refresh_token_blacklisted(token_hash_value):
        token_record.revoked = True
        db.commit()
        _clear_refresh_cookie(response)
        log_audit_event(
            db,
            action="auth.refresh.failed",
            resource="auth",
            request=request,
            user_id=token_record.user_id,
            metadata={"reason": "blacklisted"},
            use_separate_session=True,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        token_record.revoked = True
        db.commit()
        _clear_refresh_cookie(response)
        log_audit_event(
            db,
            action="auth.refresh.failed",
            resource="auth",
            request=request,
            user_id=token_record.user_id,
            metadata={"reason": "user_not_found"},
            use_separate_session=True,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if _revoke_tokens([token_record]):
        db.flush()

    refresh_plain, refresh_hash, expires_at = generate_refresh_token()
    new_entry = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(new_entry)
    db.commit()

    _set_refresh_cookie(response, refresh_plain, expires_at)

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})

    log_audit_event(
        db,
        action="auth.refresh.success",
        resource="auth",
        request=request,
        user_id=user.id,
        metadata={
            "old_token_id": token_record.id,
            "new_token_id": new_entry.id,
        },
        use_separate_session=True,
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.access_token_exp_minutes * 60,
    )

@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> MessageResponse:
    raw_token = request.cookies.get(settings.refresh_token_cookie_name)
    token_record = None
    commit_required = False
    if raw_token:
        token_hash_value = hash_token(raw_token)
        token_record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash_value).first()
        if token_record and not token_record.revoked:
            if _revoke_tokens([token_record]):
                db.flush()
                commit_required = True
        else:
            _blacklist_refresh_token(
                token_hash_value,
                datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_exp_days),
            )
    if commit_required:
        db.commit()
    _clear_refresh_cookie(response)
    log_audit_event(
        db,
        action="auth.logout",
        resource="auth",
        request=request,
        user_id=token_record.user_id if token_record else None,
        metadata={
            "had_cookie": bool(raw_token),
            "token_record_found": bool(token_record),
            "revoked_now": commit_required,
        },
        use_separate_session=True,
    )
    return MessageResponse(message="Logged out")
