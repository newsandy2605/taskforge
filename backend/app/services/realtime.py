import json

from redis.asyncio import Redis

from app.core.config import settings


async def publish_event(project_id: int, payload: dict):
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        await redis.publish(f"project:{project_id}", json.dumps(payload, default=str))
    finally:
        await redis.aclose()
