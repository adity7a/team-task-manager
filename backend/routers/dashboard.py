from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from database import get_db
from models.user import User
from models.project import Project, ProjectMember
from models.task import Task, TaskStatus
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/")
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.id

    # Get project IDs user belongs to
    memberships = db.query(ProjectMember).filter(
        ProjectMember.user_id == user_id
    ).all()
    project_ids = [m.project_id for m in memberships]

    # My assigned tasks (not done)
    my_tasks = db.query(Task).filter(
        Task.assignee_id == user_id,
        Task.status != TaskStatus.done,
        Task.project_id.in_(project_ids),
    ).order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).limit(10).all()

    # Overdue tasks
    today = date.today()
    overdue = db.query(Task).filter(
        Task.assignee_id == user_id,
        Task.due_date < today,
        Task.status != TaskStatus.done,
        Task.project_id.in_(project_ids),
    ).all()

    # Status breakdown of my tasks
    status_counts = {}
    for s in TaskStatus:
        count = db.query(func.count(Task.id)).filter(
            Task.assignee_id == user_id,
            Task.status == s,
            Task.project_id.in_(project_ids),
        ).scalar()
        status_counts[s.value] = count

    # Projects summary
    projects_data = []
    projects = db.query(Project).filter(Project.id.in_(project_ids)).all()
    for p in projects:
        total = db.query(func.count(Task.id)).filter(Task.project_id == p.id).scalar()
        done = db.query(func.count(Task.id)).filter(
            Task.project_id == p.id, Task.status == TaskStatus.done
        ).scalar()
        my_role = next((m.role.value for m in memberships if m.project_id == p.id), "member")
        projects_data.append({
            "id": p.id,
            "name": p.name,
            "color": p.color,
            "status": p.status.value,
            "total_tasks": total,
            "done_tasks": done,
            "progress": round((done / total * 100) if total > 0 else 0),
            "my_role": my_role,
        })

    # Recent activity
    recent_tasks = db.query(Task).filter(
        Task.project_id.in_(project_ids)
    ).order_by(Task.updated_at.desc()).limit(8).all()

    return {
        "my_tasks": [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status.value,
                "priority": t.priority.value,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "project_id": t.project_id,
            }
            for t in my_tasks
        ],
        "overdue_count": len(overdue),
        "overdue_tasks": [
            {
                "id": t.id,
                "title": t.title,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "project_id": t.project_id,
            }
            for t in overdue
        ],
        "status_counts": status_counts,
        "total_tasks": sum(status_counts.values()),
        "projects": projects_data,
        "recent_activity": [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status.value,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                "project_id": t.project_id,
            }
            for t in recent_tasks
        ],
    }