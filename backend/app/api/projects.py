from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, get_project_member, require_admin_access
from app.models import ActivityLog, Project, ProjectMember, Task, User
from app.schemas import ActivityOut, JobRequest, MemberAdd, MemberOut, MemberUpdate, ProjectCreate, ProjectOut
from app.services.activity import log_activity
from app.services.cache import delete, get_json, push_job, set_json
from app.services.realtime import publish_event

router = APIRouter(prefix="/projects", tags=["projects"])


def member_out(member: ProjectMember):
    return MemberOut(
        id=member.id,
        project_id=member.project_id,
        user_id=member.user_id,
        role=member.role,
        name=member.user.name,
        email=member.user.email,
    )


@router.get("", response_model=list[ProjectOut])
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cache_key = f"projects:user:{user.id}"
    cached = get_json(cache_key)
    if cached is not None:
        return cached

    projects = db.scalars(
        select(Project)
        .join(ProjectMember)
        .where(ProjectMember.user_id == user.id)
        .order_by(Project.created_at.desc())
    ).all()
    result = [ProjectOut.model_validate(p).model_dump(mode="json") for p in projects]
    set_json(cache_key, result, ttl=30)
    return result


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = Project(name=payload.name.strip(), description=payload.description.strip(), created_by=user.id)
    db.add(project)
    db.flush()
    db.add(ProjectMember(project_id=project.id, user_id=user.id, role="owner"))
    log_activity(db, project.id, user.id, "project_created", f"{user.name} created the project")
    db.commit()
    db.refresh(project)
    delete(f"projects:user:{user.id}")
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_project_member(project_id, user.id, db)
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/members", response_model=list[MemberOut])
def list_members(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_project_member(project_id, user.id, db)
    members = db.scalars(select(ProjectMember).where(ProjectMember.project_id == project_id).order_by(ProjectMember.id)).all()
    return [member_out(m) for m in members]


@router.post("/{project_id}/members", response_model=MemberOut, status_code=201)
async def add_member(project_id: int, payload: MemberAdd, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin_access(project_id, user, db)
    new_user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not new_user:
        raise HTTPException(status_code=404, detail="No user with that email exists")

    already = db.scalar(select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == new_user.id))
    if already:
        raise HTTPException(status_code=409, detail="User is already a member")

    member = ProjectMember(project_id=project_id, user_id=new_user.id, role=payload.role)
    db.add(member)
    log_activity(db, project_id, user.id, "member_added", f"{new_user.name} joined as {payload.role}")
    db.commit()
    db.refresh(member)
    delete(f"projects:user:{new_user.id}")
    await publish_event(project_id, {"type": "member_added", "message": f"{new_user.name} joined the project"})
    return member_out(member)


@router.patch("/{project_id}/members/{member_id}", response_model=MemberOut)
async def update_member(project_id: int, member_id: int, payload: MemberUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin_access(project_id, user, db)
    member = db.get(ProjectMember, member_id)
    if not member or member.project_id != project_id:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="The owner role cannot be changed")

    member.role = payload.role
    log_activity(db, project_id, user.id, "member_updated", f"{member.user.name} is now {payload.role}")
    db.commit()
    db.refresh(member)
    await publish_event(project_id, {"type": "member_updated", "message": f"{member.user.name}'s role was updated"})
    return member_out(member)


@router.delete("/{project_id}/members/{member_id}", status_code=204)
async def remove_member(project_id: int, member_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin_access(project_id, user, db)
    member = db.get(ProjectMember, member_id)
    if not member or member.project_id != project_id:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="The owner cannot be removed")

    name = member.user.name
    member_user_id = member.user_id
    db.delete(member)
    log_activity(db, project_id, user.id, "member_removed", f"{name} was removed from the project")
    db.commit()
    delete(f"projects:user:{member_user_id}")
    await publish_event(project_id, {"type": "member_removed", "message": f"{name} was removed"})


@router.get("/{project_id}/activity", response_model=list[ActivityOut])
def get_activity(project_id: int, limit: int = 30, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_project_member(project_id, user.id, db)
    limit = max(1, min(limit, 100))
    return db.scalars(
        select(ActivityLog)
        .where(ActivityLog.project_id == project_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    ).all()


@router.get("/{project_id}/stats")
def project_stats(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_project_member(project_id, user.id, db)
    rows = db.execute(
        select(Task.status, func.count(Task.id))
        .where(Task.project_id == project_id)
        .group_by(Task.status)
    ).all()
    counts = {status: int(count) for status, count in rows}
    total = sum(counts.values())
    return {
        "total": total,
        "todo": counts.get("todo", 0),
        "in_progress": counts.get("in_progress", 0),
        "done": counts.get("done", 0),
    }


@router.post("/{project_id}/jobs")
def enqueue_job(project_id: int, payload: JobRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin_access(project_id, user, db)
    if payload.project_id != project_id:
        raise HTTPException(status_code=400, detail="Project ID mismatch")
    ok = push_job({"job_type": payload.job_type, "project_id": project_id, "requested_by": user.id})
    if not ok:
        raise HTTPException(status_code=503, detail="Queue unavailable")
    return {"queued": True, "job_type": payload.job_type, "project_id": project_id}
