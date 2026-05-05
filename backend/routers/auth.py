from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.user import UserCreate, UserLogin, UserOut, UserUpdate, Token
from auth.dependencies import (
    hash_password, verify_password, create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=Token, status_code=201)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    # Check duplicate email
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Generate avatar URL from name
    name_encoded = payload.name.replace(" ", "+")
    color = "6366f1"
    avatar = f"https://ui-avatars.com/api/?name={name_encoded}&background={color}&color=fff&size=128&bold=true"

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        avatar=avatar,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    token = create_access_token(user.id)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.name:
        current_user.name = payload.name.strip()
        name_encoded = current_user.name.replace(" ", "+")
        current_user.avatar = f"https://ui-avatars.com/api/?name={name_encoded}&background=6366f1&color=fff&size=128&bold=true"
    if payload.avatar:
        current_user.avatar = payload.avatar
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/users/search", response_model=list[UserOut])
def search_users(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search users by name or email - used for adding members."""
    users = db.query(User).filter(
        (User.email.ilike(f"%{q}%")) | (User.name.ilike(f"%{q}%"))
    ).limit(10).all()
    return users