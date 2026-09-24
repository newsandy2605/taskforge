from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db import get_db
from app.models import ProjectMember, User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user_id = decode_access_token(credentials.credentials)
    if not user_id or not user_id.isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_project_member(project_id: int, user_id: int, db: Session) -> ProjectMember:
    member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this project")
    return member


def require_write_access(project_id: int, user: User, db: Session) -> ProjectMember:
    member = get_project_member(project_id, user.id, db)
    if member.role == "viewer":
        raise HTTPException(status_code=403, detail="Viewer access is read-only")
    return member


def require_admin_access(project_id: int, user: User, db: Session) -> ProjectMember:
    member = get_project_member(project_id, user.id, db)
    if member.role not in {"owner", "admin"}:
        raise HTTPException(status_code=403, detail="Admin access required")
    return member
