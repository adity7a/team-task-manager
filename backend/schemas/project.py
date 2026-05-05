from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List
from models.project import ProjectStatus, MemberRole
from .user import UserOut


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Project name cannot be empty")
        if len(v) > 150:
            raise ValueError("Name too long (max 150 chars)")
        return v.strip()

    @field_validator("color")
    @classmethod
    def valid_color(cls, v):
        if v and (not v.startswith("#") or len(v) != 7):
            raise ValueError("Color must be a valid hex like #6366f1")
        return v


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    status: Optional[ProjectStatus] = None


class MemberOut(BaseModel):
    id: int
    user: UserOut
    role: MemberRole
    joined_at: datetime

    class Config:
        from_attributes = True


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    color: str
    status: ProjectStatus
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    task_count: Optional[int] = 0
    done_count: Optional[int] = 0
    member_count: Optional[int] = 0
    my_role: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectDetail(ProjectOut):
    owner: UserOut
    members: List[MemberOut] = []

    class Config:
        from_attributes = True


class MemberAdd(BaseModel):
    email: str
    role: MemberRole = MemberRole.member