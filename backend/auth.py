"""
Authentication module for Research Lens.

Provides user registration, login, logout, and session management.
"""

import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, UserSession
from backend.schemas import (
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    UserResponse
)
from backend.config import SESSION_EXPIRY_DAYS


router = APIRouter(prefix="/api/auth", tags=["auth"])


# =============================================================================
# Helper Functions
# =============================================================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_session_token() -> str:
    """Generate a secure session token."""
    return secrets.token_urlsafe(32)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Get the current user from session cookie."""
    session_token = request.cookies.get("session_token")
    if not session_token:
        return None

    session = db.query(UserSession).filter(
        UserSession.token == session_token,
        UserSession.expires_at > datetime.utcnow()
    ).first()

    if not session:
        return None

    return db.query(User).filter(User.id == session.user_id).first()


def require_auth(request: Request, db: Session = Depends(get_db)) -> User:
    """Require authentication - raises 401 if not authenticated."""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# =============================================================================
# Auth Routes
# =============================================================================

@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Register a new user account."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == request.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate password strength
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Create user
    user = User(
        id=str(uuid.uuid4()),
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        created_at=datetime.utcnow()
    )
    db.add(user)

    # Create session
    session_token = create_session_token()
    session = UserSession(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token=session_token,
        expires_at=datetime.utcnow() + timedelta(days=SESSION_EXPIRY_DAYS),
        created_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()

    # Set session cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )

    return AuthResponse(
        success=True,
        user=UserResponse(id=user.id, email=user.email)
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Login with email and password."""
    user = db.query(User).filter(User.email == request.email.lower()).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create new session
    session_token = create_session_token()
    session = UserSession(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token=session_token,
        expires_at=datetime.utcnow() + timedelta(days=SESSION_EXPIRY_DAYS),
        created_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()

    # Set session cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )

    return AuthResponse(
        success=True,
        user=UserResponse(id=user.id, email=user.email)
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Logout and clear session."""
    session_token = request.cookies.get("session_token")

    if session_token:
        # Delete session from database
        db.query(UserSession).filter(UserSession.token == session_token).delete()
        db.commit()

    # Clear cookie
    response.delete_cookie(key="session_token")

    return {"success": True}


@router.get("/me")
async def get_me(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get current authenticated user."""
    user = get_current_user(request, db)

    if not user:
        return {"user": None}

    return {
        "user": UserResponse(id=user.id, email=user.email)
    }
