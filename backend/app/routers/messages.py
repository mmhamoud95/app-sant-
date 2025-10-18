from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc
from typing import List

from app.auth.dependencies import get_current_user
from app.db.models import User, Message, Patient, Doctor
from app.db.session import get_db
from app.schemas.messages import MessageCreate, MessageResponse, ConversationResponse

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new message"""
    # Verify receiver exists
    receiver = db.query(User).filter(User.id == message_data.receiver_id).first()
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receiver not found",
        )

    message = Message(
        sender_id=current_user.id,
        receiver_id=message_data.receiver_id,
        content=message_data.content,
        attachment_url=message_data.attachment_url,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all conversations for current user"""
    # Get unique users that current user has exchanged messages with
    subquery = (
        db.query(Message.sender_id.label("user_id"))
        .filter(Message.receiver_id == current_user.id)
        .union(
            db.query(Message.receiver_id.label("user_id"))
            .filter(Message.sender_id == current_user.id)
        )
    ).subquery()

    users = db.query(User).filter(User.id.in_(db.query(subquery.c.user_id))).all()

    conversations = []
    for user in users:
        # Get last message
        last_message = (
            db.query(Message)
            .filter(
                or_(
                    and_(Message.sender_id == current_user.id, Message.receiver_id == user.id),
                    and_(Message.sender_id == user.id, Message.receiver_id == current_user.id),
                )
            )
            .order_by(desc(Message.created_at))
            .first()
        )

        # Count unread messages
        unread_count = (
            db.query(func.count(Message.id))
            .filter(
                Message.sender_id == user.id,
                Message.receiver_id == current_user.id,
                Message.read == False,
            )
            .scalar()
        )

        # Get user name based on role
        user_name = ""
        if user.role == "patient" and user.patient:
            user_name = f"{user.patient.first_name} {user.patient.last_name}"
        elif user.role == "doctor" and user.doctor:
            user_name = f"Dr. {user.doctor.first_name} {user.doctor.last_name}"
        else:
            user_name = user.email

        conversations.append(
            ConversationResponse(
                user_id=user.id,
                user_name=user_name,
                user_role=user.role.value,
                last_message=last_message.content if last_message else "",
                last_message_date=last_message.created_at if last_message else user.created_at,
                unread_count=unread_count,
            )
        )

    # Sort by last message date
    conversations.sort(key=lambda x: x.last_message_date, reverse=True)
    return conversations


@router.get("/{user_id}", response_model=List[MessageResponse])
def get_messages_with_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all messages between current user and specified user"""
    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
                and_(Message.sender_id == user_id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at)
        .all()
    )

    # Mark messages as read
    for msg in messages:
        if msg.receiver_id == current_user.id and not msg.read:
            msg.read = True
    db.commit()

    return messages


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a message (only sender can delete)"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own messages",
        )

    db.delete(message)
    db.commit()
