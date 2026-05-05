from pydantic import BaseModel, field_validator
from datetime import datetime, date
from typing import Optional, List
from models.task import TaskStatus, TaskPriority
from .user import UserOut


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Task title cannot be empty")
        if len(v) > 200:
            raise ValueError("Title too long (max 200 chars)")
        return v.strip()


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[date]
    project_id: int
    assignee_id: Optional[int]
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]
    assignee: Optional[UserOut] = None
    creator: Optional[UserOut] = None
    comment_count: Optional[int] = 0

    class Config:
        from_attributes = True


class TaskDetail(TaskOut):
    comments: List["CommentOut"] = []

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Comment cannot be empty")
        return v.strip()


class CommentOut(BaseModel):
    id: int
    content: str
    task_id: int
    user_id: int
    created_at: datetime
    user: UserOut

    class Config:
        from_attributes = True


TaskDetail.model_rebuild()