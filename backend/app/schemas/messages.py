from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MessageCreate(BaseModel):
    receiver_id: int
    content: str
    attachment_url: Optional[str] = None


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    attachment_url: Optional[str] = None
    read: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    user_id: int
    user_name: str
    user_role: str
    last_message: str
    last_message_date: datetime
    unread_count: int
