from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from typing import Dict, List
import json

from app.db.models import User

router = APIRouter(prefix="/ws", tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast(self, message: dict):
        for user_connections in self.active_connections.values():
            for connection in user_connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


@router.websocket("/messages")
async def websocket_messages(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time messaging"""
    # Validate token and get user
    try:
        from app.auth.utils import decode_access_token
        from app.db.session import SessionLocal
        
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        db = SessionLocal()
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        await manager.connect(user.id, websocket)
        
        try:
            while True:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Broadcast message to receiver
                if "receiver_id" in message_data:
                    receiver_id = message_data["receiver_id"]
                    await manager.send_personal_message(
                        {
                            "type": "new_message",
                            "sender_id": user.id,
                            "content": message_data.get("content", ""),
                            "timestamp": message_data.get("timestamp", ""),
                        },
                        receiver_id,
                    )
        except WebSocketDisconnect:
            manager.disconnect(user.id, websocket)
        except Exception as e:
            manager.disconnect(user.id, websocket)
        finally:
            db.close()
    except Exception as e:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
