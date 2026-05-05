from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import date

from database import get_db
from models.user import User
from models.project import ProjectMember
from models.task import Task, TaskComment, TaskStatus, TaskPriority
from schemas.task import TaskCreate, TaskUpdate, TaskOut, TaskDetail, CommentCreate, CommentOut
from auth.dependencies import get_current_user, get_project_member_role

router = APIRouter(prefix="/api/projects/{project_id}/tasks", tags=["Tasks"])


def _check_project_access(project_id: int, user: User, db: Session, require: list = None):
    role = get_project_member_role(project_id, user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="Access denied to this project")
    if require and role not in require:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return role


# ─── List tasks ───────────────────────────────────────────────────────────────
@router.get("/", response_model=List[TaskOut])
def list_tasks(
    project_id: int,
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    assignee_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_project_access(project_id, current_user, db)

    query = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.creator),
    ).filter(Task.project_id == project_id)

    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))

    tasks = query.order_by(Task.created_at.desc()).all()

    result = []
    for t in tasks:
        comment_count = db.query(func.count(TaskComment.id)).filter(
            TaskComment.task_id == t.id
        ).scalar()
        out = TaskOut.model_validate(t)
        out.comment_count = comment_count
        result.append(out)
    return result


# ─── Create task ──────────────────────────────────────────────────────────────
@router.post("/", response_model=TaskOut, status_code=201)
def create_task(
    project_id: int,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_project_access(project_id, current_user, db)

    # Validate assignee is a project member
    if payload.assignee_id:
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == payload.assignee_id,
        ).first()
        if not is_member:
            raise HTTPException(status_code=400, detail="Assignee must be a project member")

    task = Task(
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        due_date=payload.due_date,
        project_id=project_id,
        assignee_id=payload.assignee_id,
        created_by=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Reload with relationships
    task = db.query(Task).options(
        joinedload(Task.assignee), joinedload(Task.creator)
    ).filter(Task.id == task.id).first()

    out = TaskOut.model_validate(task)
    out.comment_count = 0
    return out


# ─── Get single task ──────────────────────────────────────────────────────────
@router.get("/{task_id}", response_model=TaskDetail)
def get_task(
    project_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_project_access(project_id, current_user, db)

    task = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.creator),
        joinedload(Task.comments).joinedload(TaskComment.user),
    ).filter(Task.id == task_id, Task.project_id == project_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    out = TaskDetail.model_validate(task)
    out.comment_count = len(task.comments)
    return out


# ─── Update task ──────────────────────────────────────────────────────────────
@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    project_id: int,
    task_id: int,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_project_access(project_id, current_user, db)

    task = db.query(Task).filter(
        Task.id == task_id, Task.project_id == project_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.status is not None:
        task.status = payload.status
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.assignee_id is not None:
        # validate assignee
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == payload.assignee_id,
        ).first()
        if not is_member:
            raise HTTPException(status_code=400, detail="Assignee must be a project member")
        task.assignee_id = payload.assignee_id

    db.commit()
    db.refresh(task)

    task = db.query(Task).options(
        joinedload(Task.assignee), joinedload(Task.creator)
    ).filter(Task.id == task.id).first()

    comment_count = db.query(func.count(TaskComment.id)).filter(
        TaskComment.task_id == task.id
    ).scalar()
    out = TaskOut.model_validate(task)
    out.comment_count = comment_count
    return out


# ─── Delete task ──────────────────────────────────────────────────────────────
@router.delete("/{task_id}")
def delete_task(
    project_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = _check_project_access(project_id, current_user, db)
    task = db.query(Task).filter(
        Task.id == task_id, Task.project_id == project_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Only creator or admin can delete
    if task.created_by != current_user.id and role != "admin":
        raise HTTPException(status_code=403, detail="Only the task creator or admin can delete it")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}


# ─── Add comment ──────────────────────────────────────────────────────────────
@router.post("/{task_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    project_id: int,
    task_id: int,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_project_access(project_id, current_user, db)

    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = TaskComment(
        content=payload.content,
        task_id=task_id,
        user_id=current_user.id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    comment = db.query(TaskComment).options(
        joinedload(TaskComment.user)
    ).filter(TaskComment.id == comment.id).first()

    return CommentOut.model_validate(comment)


# ─── Delete comment ───────────────────────────────────────────────────────────
@router.delete("/{task_id}/comments/{comment_id}")
def delete_comment(
    project_id: int,
    task_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_project_access(project_id, current_user, db)

    comment = db.query(TaskComment).filter(
        TaskComment.id == comment_id, TaskComment.task_id == task_id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}