from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.utils import decode_token
from app.db.models import Doctor, Patient, User, UserRole
from app.db.session import get_db

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def require_role(expected_role: UserRole):
    def _enforce_role(user: User = Depends(get_current_user)) -> User:
        if user.role != expected_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this resource")
        return user

    return _enforce_role


def get_current_patient(
    user: User = Depends(require_role(UserRole.patient)),
) -> Patient:
    patient = user.patient
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")
    return patient


def get_current_doctor(
    user: User = Depends(require_role(UserRole.doctor)),
) -> Doctor:
    doctor = user.doctor
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return doctor


def get_current_admin(
    user: User = Depends(require_role(UserRole.admin)),
) -> User:
    return user
