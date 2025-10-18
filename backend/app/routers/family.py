from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.auth.dependencies import get_current_user
from app.db.models import User, FamilyProfile
from app.db.session import get_db
from app.schemas.family import FamilyProfileCreate, FamilyProfileUpdate, FamilyProfileResponse

router = APIRouter(prefix="/family", tags=["family"])


@router.post("/", response_model=FamilyProfileResponse, status_code=status.HTTP_201_CREATED)
def create_family_profile(
    profile_data: FamilyProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new family profile"""
    # Only patients can create family profiles
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can create family profiles",
        )

    profile = FamilyProfile(
        patient_id=current_user.id,
        first_name=profile_data.first_name,
        last_name=profile_data.last_name,
        relationship_type=profile_data.relationship_type,
        date_of_birth=profile_data.date_of_birth,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/", response_model=List[FamilyProfileResponse])
def get_family_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all family profiles for current patient"""
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access family profiles",
        )

    profiles = (
        db.query(FamilyProfile)
        .filter(FamilyProfile.patient_id == current_user.id)
        .order_by(FamilyProfile.created_at.desc())
        .all()
    )
    return profiles


@router.get("/{profile_id}", response_model=FamilyProfileResponse)
def get_family_profile(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific family profile"""
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access family profiles",
        )

    profile = db.query(FamilyProfile).filter(FamilyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family profile not found",
        )

    if profile.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own family profiles",
        )

    return profile


@router.put("/{profile_id}", response_model=FamilyProfileResponse)
def update_family_profile(
    profile_id: int,
    profile_data: FamilyProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a family profile"""
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can update family profiles",
        )

    profile = db.query(FamilyProfile).filter(FamilyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family profile not found",
        )

    if profile.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own family profiles",
        )

    # Update fields
    if profile_data.first_name is not None:
        profile.first_name = profile_data.first_name
    if profile_data.last_name is not None:
        profile.last_name = profile_data.last_name
    if profile_data.relationship_type is not None:
        profile.relationship_type = profile_data.relationship_type
    if profile_data.date_of_birth is not None:
        profile.date_of_birth = profile_data.date_of_birth

    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_family_profile(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a family profile"""
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can delete family profiles",
        )

    profile = db.query(FamilyProfile).filter(FamilyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family profile not found",
        )

    if profile.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own family profiles",
        )

    db.delete(profile)
    db.commit()
