from sqlalchemy.orm import Session

from app.models import ActivityLog


def log_activity(db: Session, project_id: int, user_id: int, action: str, message: str):
    item = ActivityLog(
        project_id=project_id,
        user_id=user_id,
        action=action,
        message=message,
    )
    db.add(item)
    return item
