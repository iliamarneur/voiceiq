"""Authentication service — JWT-based auth for ClearRecap.

Features:
- User registration & login (email + bcrypt password)
- JWT token generation & verification (HS256, 24h expiry)
- FastAPI dependency `get_current_user` for route protection
- Optional auth via AUTH_ENABLED env var (off = legacy single-user mode)
- Admin role check
"""
import os
import uuid
import logging
from datetime import datetime, timedelta, timezone

import jwt
import bcrypt
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import User

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "voiceiq-dev-secret-change-me-in-production-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 1
AUTH_ENABLED = os.environ.get("AUTH_ENABLED", "false").lower() == "true"


# ── Password helpers ──────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers ───────────────────────────────────────────
def create_access_token(user_id: str, email: str, role: str = "user") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT. Raises on invalid/expired."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# ── Refresh token helpers ────────────────────────────────
REFRESH_SECRET = os.environ.get("JWT_REFRESH_SECRET", JWT_SECRET + "-refresh")
REFRESH_EXPIRY_DAYS = 30


def create_refresh_token(user_id: str) -> str:
    """Create a long-lived refresh token (30 days)."""
    payload = {
        "sub": user_id,
        "purpose": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, REFRESH_SECRET, algorithm=JWT_ALGORITHM)


def decode_refresh_token(token: str) -> str:
    """Decode refresh token. Returns user_id. Raises on invalid/expired."""
    payload = jwt.decode(token, REFRESH_SECRET, algorithms=[JWT_ALGORITHM])
    if payload.get("purpose") != "refresh":
        raise jwt.InvalidTokenError("Not a refresh token")
    return payload["sub"]


# ── User CRUD ─────────────────────────────────────────────
async def register_user(db: AsyncSession, email: str, password: str, name: str = "") -> User:
    """Create a new user. Raises HTTPException 409 if email taken."""
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Un compte existe déjà avec cet email.")

    user = User(
        id=str(uuid.uuid4()),
        email=email.lower().strip(),
        password_hash=hash_password(password),
        name=name.strip(),
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """Verify credentials. Raises HTTPException 401 on failure."""
    result = await db.execute(select(User).where(User.email == email.lower().strip()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")
    return user


# ── FastAPI dependencies ──────────────────────────────────
def _extract_token(request: Request) -> str | None:
    """Extract Bearer token from Authorization header."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


def create_reset_token(email: str) -> str:
    """Create a short-lived JWT for password reset (30 min expiry)."""
    payload = {
        "sub": email,
        "purpose": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_reset_token(token: str) -> str:
    """Decode reset token, returns email. Raises on invalid/expired."""
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    if payload.get("purpose") != "password_reset":
        raise jwt.InvalidTokenError("Not a reset token")
    return payload["sub"]


async def get_current_user(request: Request) -> User | None:
    """FastAPI dependency — returns current user or None if auth disabled.

    When AUTH_ENABLED=false, returns a stub User with id="default" (legacy mode).
    When AUTH_ENABLED=true, requires valid JWT Bearer token.
    """
    if not AUTH_ENABLED:
        # Legacy single-user mode — return stub
        return User(id="default", email="default@local", name="Utilisateur", role="admin", password_hash="")

    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Authentification requise.")

    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée, veuillez vous reconnecter.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide.")

    # Fetch user from DB
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == payload["sub"]))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable.")
        return user


async def require_admin(request: Request) -> User:
    """FastAPI dependency — requires authenticated admin user."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentification requise.")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")
    return user


async def get_current_user_id(request: Request) -> str:
    """Convenience dependency — returns just the user_id string."""
    user = await get_current_user(request)
    return user.id if user else "default"


async def get_optional_user_id(request: Request) -> str:
    """Like get_current_user_id but never raises — returns 'anonymous' if no auth."""
    if not AUTH_ENABLED:
        return "default"
    token = _extract_token(request)
    if not token:
        return "anonymous"
    try:
        payload = decode_token(token)
        return payload.get("sub", "anonymous")
    except Exception:
        return "anonymous"
