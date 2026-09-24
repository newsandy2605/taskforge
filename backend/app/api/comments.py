from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, get_project_member, require_write_access
from app.models import Comment, Task, User
from app.schemas import CommentCreate, CommentOut
from app.services.activity import log_activity
from app.services.cache import delete, get_json, set_json
from app.services.realtime import publish_event

router = APIRouter(prefix="/tasks", tags=["comments"])


@router.get("/{task_id}/comments", response_model=list[CommentOut])
def list_comments(task_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    get_project_member(task.project_id, user.id, db)

    cache_key = f"comments:task:{task_id}"
    cached = get_json(cache_key)
    if cached is not None:
        return cached

    comments = db.scalars(select(Comment).where(Comment.task_id == task_id).order_by(Comment.created_at.asc())).all()
    result = [
        {
            "id": comment.id,
            "task_id": comment.task_id,
            "user_id": comment.user_id,
            "author_name": comment.author.name,
            "body": comment.body,
            "created_at": comment.created_at,
        }
        for comment in comments
    ]
    set_json(cache_key, result, ttl=15)
    return result


@router.post("/{task_id}/comments", response_model=CommentOut, status_code=201)
async def add_comment(task_id: int, payload: CommentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    require_write_access(task.project_id, user, db)

    comment = Comment(task_id=task_id, user_id=user.id, body=payload.body.strip())
    db.add(comment)
    log_activity(db, task.project_id, user.id, "comment_added", f'{user.name} commented on "{task.title}"')
    db.commit()
    db.refresh(comment)
    delete(f"comments:task:{task_id}")
    await publish_event(task.project_id, {"type": "comment_added", "message": f"New comment on {task.title}"})
    return {
        "id": comment.id,
        "task_id": comment.task_id,
        "user_id": comment.user_id,
        "author_name": user.name,
        "body": comment.body,
        "created_at": comment.created_at,
    }
