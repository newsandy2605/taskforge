import json

from redis import Redis

from app.core.config import settings

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)


def get_json(key: str):
    try:
        value = redis_client.get(key)
        return json.loads(value) if value else None
    except Exception:
        return None


def set_json(key: str, value, ttl: int = 60):
    try:
        redis_client.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass


def delete(key: str):
    try:
        redis_client.delete(key)
    except Exception:
        pass


def push_job(payload: dict):
    try:
        redis_client.rpush("taskforge:jobs", json.dumps(payload, default=str))
        return True
    except Exception:
        return False
