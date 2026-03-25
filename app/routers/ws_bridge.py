"""
WebSocket bridge between user agents and PesaPips backend.
Each user's agent connects here and waits for trade commands.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Optional
import json
import asyncio
import logging
from datetime import datetime
from app.core.database import get_db
from app.models.user import User
from app.models.mt5_account import MT5Account

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket"])

# Active agent connections: user_id -> WebSocket
agent_connections: Dict[int, WebSocket] = {}
# Pending responses: request_id -> asyncio.Future
pending_responses: Dict[str, asyncio.Future] = {}


class AgentManager:
    def register(self, user_id: int, ws: WebSocket):
        agent_connections[user_id] = ws
        logger.info(f"Agent connected: user_id={user_id}")

    def unregister(self, user_id: int):
        agent_connections.pop(user_id, None)
        logger.info(f"Agent disconnected: user_id={user_id}")

    def is_connected(self, user_id: int) -> bool:
        return user_id in agent_connections

    async def send_command(self, user_id: int, command: dict, timeout: float = 15.0) -> dict:
        if user_id not in agent_connections:
            return {"status": "error", "message": "MT5 agent not connected. Please run the PesaPips agent on your computer."}

        import uuid
        request_id = str(uuid.uuid4())
        command["request_id"] = request_id

        loop = asyncio.get_event_loop()
        future = loop.create_future()
        pending_responses[request_id] = future

        try:
            ws = agent_connections[user_id]
            await ws.send_text(json.dumps(command))
            result = await asyncio.wait_for(future, timeout=timeout)
            return result
        except asyncio.TimeoutError:
            return {"status": "error", "message": "MT5 agent timed out. Make sure MT5 is running."}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            pending_responses.pop(request_id, None)


manager = AgentManager()


@router.websocket("/agent/{user_id}/{token}")
async def agent_endpoint(websocket: WebSocket, user_id: int, token: str, db: Session = Depends(get_db)):
    # Verify token
    from app.dependencies import verify_token
    user = verify_token(token, db)
    if not user or user.id != user_id:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    manager.register(user_id, websocket)

    # Update MT5 account connection status
    account = db.query(MT5Account).filter(MT5Account.user_id == user_id).first()
    if account:
        account.is_connected = True
        db.commit()

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                request_id = msg.get("request_id")
                if request_id and request_id in pending_responses:
                    future = pending_responses[request_id]
                    if not future.done():
                        future.set_result(msg)
                # Handle heartbeat
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.unregister(user_id)
        # Update connection status
        try:
            account = db.query(MT5Account).filter(MT5Account.user_id == user_id).first()
            if account:
                account.is_connected = False
                db.commit()
        except:
            pass


# REST endpoint to check agent status
@router.get("/agent/status/{user_id}")
def agent_status(user_id: int, db: Session = Depends(get_db)):
    connected = manager.is_connected(user_id)
    return {"connected": connected, "user_id": user_id}
