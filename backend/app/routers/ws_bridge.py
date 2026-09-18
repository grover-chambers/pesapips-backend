"""
WebSocket bridge between user agents and PesaPips backend.
Each user's agent connects here and waits for trade commands.

Security notes:
- WebSocket authentication uses the Sec-WebSocket-Protocol subprotocol header
  (NOT the URL path) so JWT tokens do not leak to server access logs, browser
  history, or proxies.
- The REST status endpoint requires the requesting user to be authenticated
  and only permits querying one's own status.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Header, Query
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
            logger.exception("Error sending command to agent")
            return {"status": "error", "message": str(e)}
        finally:
            pending_responses.pop(request_id, None)


manager = AgentManager()


@router.websocket("/agent/{user_id}")
async def agent_endpoint(
    websocket: WebSocket,
    user_id: int,
    sec_websocket_protocol: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """WebSocket endpoint for MT5 agent connections.

    Authentication: JWT sent via the Sec-WebSocket-Protocol header (subprotocol
    field). The client must open the WebSocket with:
        new WebSocket(url, [token])   # browser passes token as subprotocol
    This keeps the JWT out of URL query strings (which are logged by reverse
    proxies and persisted in browser history).
    """
    from app.dependencies import verify_token

    token = sec_websocket_protocol
    if not token:
        await websocket.close(code=4001, reason="Missing auth subprotocol")
        return

    user = verify_token(token, db)
    if not user or user.id != user_id:
        await websocket.close(code=4001, reason="Invalid token")
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
        except Exception:
            logger.exception("Failed to mark MT5 account disconnected")


def _get_current_user_or_403(
    token: str = Query(default=None),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """Authenticates via Authorization header (Bearer token) for REST endpoints."""
    from app.dependencies import verify_token
    raw = None
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization[7:].strip()
    elif token:
        raw = token
    if not raw:
        raise HTTPException(status_code=401, detail="Missing token")
    user = verify_token(raw, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


# REST endpoint to check agent status — auth required, can only query own status
@router.get("/agent/status/{user_id}")
def agent_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user_or_403),
):
    if user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view another user's status")
    connected = manager.is_connected(user_id)
    return {"connected": connected, "user_id": user_id}
