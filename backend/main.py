from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
load_dotenv()
from database import engine, Base
import models
from routers import auth, projects, tasks, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")
    yield
    print("🛑 Shutting down...")

app = FastAPI(
    title="Team Task Manager API",
    description="A full-featured project and task management API with role-based access control",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://team-task-manager-1-3v5v.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)

@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "ok", "message": "Team Task Manager API is running 🚀"}

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to Team Task Manager API",
        "docs": "/docs",
        "health": "/api/health",
    }
