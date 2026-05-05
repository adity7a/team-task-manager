from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List

from database import get_db
from models.user import User
from models.project import Project, ProjectMember, MemberRole
from models.task import Task
from schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectOut, ProjectDetail, MemberAdd, MemberOut
)
from auth.dependencies import get_current_user, get_project_member_role

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def _check_member(project_id: int, user: User, db: Session, require: list = None):
    role = get_project_member_role(project_id, user, db)
    if role is None:
        raise HTTPException(status_code=403, detail="You are not a member of this project")
    if require and role not in require:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return role


# ─── List all projects for current user ───────────────────────────────────────
@router.get("/", response_model=List[ProjectOut])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Get all projects where user is a member
    memberships = db.query(ProjectMember).filter(
        ProjectMember.user_id == current_user.id
    ).all()
    project_ids = [m.project_id for m in memberships]

    projects = db.query(Project).filter(Project.id.in_(project_ids)).all()

    result = []
    for p in projects:
        task_count = db.query(func.count(Task.id)).filter(Task.project_id == p.id).scalar()
        done_count = db.query(func.count(Task.id)).filter(
            Task.project_id == p.id, Task.status == "done"
        ).scalar()
        member_count = db.query(func.count(ProjectMember.id)).filter(
            ProjectMember.project_id == p.id
        ).scalar()
        my_membership = next((m for m in memberships if m.project_id == p.id), None)

        out = ProjectOut.model_validate(p)
        out.task_count = task_count
        out.done_count = done_count
        out.member_count = member_count
        out.my_role = my_membership.role.value if my_membership else "admin"
        result.append(out)

    return result


# ─── Create project ───────────────────────────────────────────────────────────
@router.post("/", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = Project(
        name=payload.name,
        description=payload.description,
        color=payload.color or "#6366f1",
        owner_id=current_user.id,
    )
    db.add(project)
    db.flush()  # get project.id before commit

    # Auto-add creator as admin member
    membership = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=MemberRole.admin,
    )
    db.add(membership)
    db.commit()
    db.refresh(project)

    out = ProjectOut.model_validate(project)
    out.task_count = 0
    out.done_count = 0
    out.member_count = 1
    out.my_role = "admin"
    return out


# ─── Get single project ───────────────────────────────────────────────────────
@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_member(project_id, current_user, db)
    project = db.query(Project).options(
        joinedload(Project.owner),
        joinedload(Project.members).joinedload(ProjectMember.user),
    ).filter(Project.id == project_id).first()

    task_count = db.query(func.count(Task.id)).filter(Task.project_id == project_id).scalar()
    done_count = db.query(func.count(Task.id)).filter(
        Task.project_id == project_id, Task.status == "done"
    ).scalar()

    out = ProjectDetail.model_validate(project)
    out.task_count = task_count
    out.done_count = done_count
    out.member_count = len(project.members)
    return out


# ─── Update project ───────────────────────────────────────────────────────────
@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_member(project_id, current_user, db, require=["admin"])
    project = db.query(Project).filter(Project.id == project_id).first()

    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    if payload.color is not None:
        project.color = payload.color
    if payload.status is not None:
        project.status = payload.status

    db.commit()
    db.refresh(project)
    return ProjectOut.model_validate(project)


# ─── Delete project ───────────────────────────────────────────────────────────
@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can delete it")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}


# ─── Add member ───────────────────────────────────────────────────────────────
@router.post("/{project_id}/members", response_model=MemberOut, status_code=201)
def add_member(
    project_id: int,
    payload: MemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_member(project_id, current_user, db, require=["admin"])

    # Find user by email
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found with that email. They must register first.")

    # Check already member
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member of this project")

    member = ProjectMember(project_id=project_id, user_id=user.id, role=payload.role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return MemberOut.model_validate(member)


# ─── Remove member ────────────────────────────────────────────────────────────
@router.delete("/{project_id}/members/{user_id}")
def remove_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_member(project_id, current_user, db, require=["admin"])
    project = db.query(Project).filter(Project.id == project_id).first()

    if user_id == project.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove the project owner")

    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()
    return {"message": "Member removed"}


# ─── Update member role ───────────────────────────────────────────────────────
@router.put("/{project_id}/members/{user_id}/role")
def update_member_role(
    project_id: int,
    user_id: int,
    role: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_member(project_id, current_user, db, require=["admin"])
    if role not in ["admin", "member"]:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")

    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.role = MemberRole(role)
    db.commit()
    return {"message": "Role updated", "role": role}