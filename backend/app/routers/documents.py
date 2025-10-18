from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from pathlib import Path

from app.auth.dependencies import get_current_user
from app.db.models import User, MedicalDocument, Patient
from app.db.session import get_db
from app.schemas.documents import MedicalDocumentCreate, MedicalDocumentResponse

router = APIRouter(prefix="/documents", tags=["documents"])

# Configure upload directory
UPLOAD_DIR = Path("/tmp/medical_documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file types
ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload", response_model=MedicalDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    type: str = "report",
    title: str = "",
    doctor_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a medical document"""
    # Check if user is a patient
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can upload documents",
        )

    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    # Read file content and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024 * 1024)}MB",
        )

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Create database record
    document = MedicalDocument(
        patient_id=current_user.id,
        doctor_id=doctor_id,
        type=type,
        title=title or file.filename,
        file_url=str(file_path),
        file_size=len(content),
        mime_type=file.content_type,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.get("/", response_model=List[MedicalDocumentResponse])
def get_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all documents for current user"""
    if current_user.role == "patient":
        documents = (
            db.query(MedicalDocument)
            .filter(MedicalDocument.patient_id == current_user.id)
            .order_by(MedicalDocument.created_at.desc())
            .all()
        )
    elif current_user.role == "doctor":
        documents = (
            db.query(MedicalDocument)
            .filter(MedicalDocument.doctor_id == current_user.id)
            .order_by(MedicalDocument.created_at.desc())
            .all()
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients and doctors can access documents",
        )

    return documents


@router.get("/{document_id}", response_model=MedicalDocumentResponse)
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific document"""
    document = db.query(MedicalDocument).filter(MedicalDocument.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Check permissions
    if current_user.role == "patient" and document.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own documents",
        )
    elif current_user.role == "doctor" and document.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access documents you uploaded",
        )

    return document


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download a document file"""
    document = db.query(MedicalDocument).filter(MedicalDocument.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Check permissions
    if current_user.role == "patient" and document.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only download your own documents",
        )
    elif current_user.role == "doctor" and document.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only download documents you uploaded",
        )

    # Check if file exists
    if not os.path.exists(document.file_url):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server",
        )

    return FileResponse(
        path=document.file_url,
        media_type=document.mime_type,
        filename=document.title,
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a document"""
    document = db.query(MedicalDocument).filter(MedicalDocument.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Check permissions
    if current_user.role == "patient" and document.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own documents",
        )
    elif current_user.role == "doctor" and document.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete documents you uploaded",
        )

    # Delete file from filesystem
    if os.path.exists(document.file_url):
        os.remove(document.file_url)

    # Delete database record
    db.delete(document)
    db.commit()
