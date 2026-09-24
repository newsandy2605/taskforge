from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import ActivityLog, User
from app.services.cache import redis_client

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/health")
def jobs_health(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    queue_size = 0
    try:
        queue_size = redis_client.llen("taskforge:jobs")
    except Exception:
        pass
    return {"queue": "taskforge:jobs", "pending": queue_size}
