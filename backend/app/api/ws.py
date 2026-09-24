import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from redis.asyncio import Redis

from app.core.config import settings
from app.core.security import decode_access_token
from app.db import SessionLocal
from app.deps import get_project_member
from app.models import User

router = APIRouter(tags=["realtime"])


@router.websocket("/ws/projects/{project_id}")
async def project_socket(websocket: WebSocket, project_id: int, token: str):
    user_id = decode_access_token(token)
    if not user_id or not user_id.isdigit():
        await websocket.close(code=1008)
        return

    with SessionLocal() as db:
        user = db.get(User, int(user_id))
        if not user:
            await websocket.close(code=1008)
            return
        try:
            get_project_member(project_id, user.id, db)
        except Exception:
            await websocket.close(code=1008)
            return

    await websocket.accept()
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis.pubsub()
    channel = f"project:{project_id}"
    await pubsub.subscribe(channel)

    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("data"):
                try:
                    await websocket.send_json(json.loads(message["data"]))
                except json.JSONDecodeError:
                    pass
            await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        await redis.aclose()
