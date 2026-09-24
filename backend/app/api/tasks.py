from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, get_project_member, require_write_access
from app.models import Project, Task, User
from app.schemas import TaskCreate, TaskOut, TaskUpdate
from app.services.activity import log_activity
from app.services.cache import delete, get_json, set_json
from app.services.realtime import publish_event

router = APIRouter(tags=["tasks"])


@router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    project_id: int,
    search: str = "",
    status: str = "",
    priority: str = "",
    assigned_to: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_member(project_id, user.id, db)
    cache_key = None
    if not any([search, status, priority, assigned_to]):
        cache_key = f"tasks:project:{project_id}"
        cached = get_json(cache_key)
        if cached is not None:
            return cached

    query = select(Task).where(Task.project_id == project_id)
    if search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(Task.title.ilike(term), Task.description.ilike(term)))
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if assigned_to is not None:
        query = query.where(Task.assignee_id == assigned_to)

    tasks = db.scalars(query.order_by(Task.status, Task.order_index, Task.updated_at.desc())).all()
    result = [TaskOut.model_validate(task).model_dump(mode="json") for task in tasks]
    if cache_key:
        set_json(cache_key, result, ttl=15)
    return result


@router.post("/projects/{project_id}/tasks", response_model=TaskOut, status_code=201)
async def create_task(project_id: int, payload: TaskCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_write_access(project_id, user, db)
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.assignee_id is not None:
        get_project_member(project_id, payload.assignee_id, db)

    max_index = db.scalar(select(Task.order_index).where(Task.project_id == project_id).order_by(Task.order_index.desc()).limit(1))
    task = Task(
        project_id=project_id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        priority=payload.priority,
        assignee_id=payload.assignee_id,
        due_date=payload.due_date,
        order_index=(max_index or 0) + 1,
        created_by=user.id,
    )
    db.add(task)
    db.flush()
    log_activity(db, project_id, user.id, "task_created", f'{user.name} created "{task.title}"')
    db.commit()
    db.refresh(task)
    delete(f"tasks:project:{project_id}")
    await publish_event(project_id, {"type": "task_created", "message": f"{task.title} was created"})
    return task


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(task_id: int, payload: TaskUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    require_write_access(task.project_id, user, db)
    if payload.assignee_id is not None:
        get_project_member(task.project_id, payload.assignee_id, db)

    changes = payload.model_dump(exclude_unset=True)
    old_status = task.status
    for key, value in changes.items():
        setattr(task, key, value)

    detail = f'{user.name} updated "{task.title}"'
    if "status" in changes and changes["status"] != old_status:
        detail = f'{user.name} moved "{task.title}" to {changes["status"].replace("_", " ")}'
    log_activity(db, task.project_id, user.id, "task_updated", detail)
    db.commit()
    db.refresh(task)
    delete(f"tasks:project:{task.project_id}")
    await publish_event(task.project_id, {"type": "task_updated", "message": detail})
    return task


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member = require_write_access(task.project_id, user, db)
    if member.role not in {"owner", "admin"} and task.created_by != user.id:
        raise HTTPException(status_code=403, detail="You cannot delete this task")

    project_id = task.project_id
    title = task.title
    db.delete(task)
    log_activity(db, project_id, user.id, "task_deleted", f'{user.name} deleted "{title}"')
    db.commit()
    delete(f"tasks:project:{project_id}")
    await publish_event(project_id, {"type": "task_deleted", "message": f"{title} was deleted"})
