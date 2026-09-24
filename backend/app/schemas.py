from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=2000)


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    created_by: int
    created_at: datetime


class MemberAdd(BaseModel):
    email: EmailStr
    role: Literal["admin", "member", "viewer"] = "member"


class MemberUpdate(BaseModel):
    role: Literal["admin", "member", "viewer"]


class MemberOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    role: str
    name: str
    email: EmailStr


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    description: str = Field(default="", max_length=5000)
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    assignee_id: int | None = None
    due_date: datetime | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=5000)
    status: Literal["todo", "in_progress", "done"] | None = None
    priority: Literal["low", "medium", "high", "urgent"] | None = None
    assignee_id: int | None = None
    due_date: datetime | None = None
    order_index: int | None = Field(default=None, ge=0)


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str
    status: str
    priority: str
    assignee_id: int | None
    due_date: datetime | None
    order_index: int
    created_by: int
    created_at: datetime
    updated_at: datetime


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    id: int
    task_id: int
    user_id: int
    author_name: str
    body: str
    created_at: datetime


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    user_id: int
    action: str
    message: str
    created_at: datetime


class JobRequest(BaseModel):
    job_type: Literal["rebuild_project_cache", "send_digest"]
    project_id: int
