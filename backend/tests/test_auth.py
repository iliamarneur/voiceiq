"""Tests for auth service — JWT, user registration, login, middleware."""
import pytest
import uuid
from unittest.mock import patch

# Test password hashing
def test_hash_and_verify_password():
    from app.services.auth_service import hash_password, verify_password
    hashed = hash_password("test1234")
    assert hashed != "test1234"
    assert verify_password("test1234", hashed)
    assert not verify_password("wrong", hashed)


def test_create_and_decode_token():
    from app.services.auth_service import create_access_token, decode_token
    token = create_access_token("user-123", "test@test.com", "user")
    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["email"] == "test@test.com"
    assert payload["role"] == "user"


def test_decode_invalid_token():
    import jwt
    from app.services.auth_service import decode_token
    with pytest.raises(jwt.InvalidTokenError):
        decode_token("invalid-token")


def test_decode_expired_token():
    import jwt as pyjwt
    from datetime import datetime, timedelta, timezone
    from app.services.auth_service import JWT_SECRET, JWT_ALGORITHM
    payload = {
        "sub": "user-123",
        "email": "test@test.com",
        "role": "user",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        "iat": datetime.now(timezone.utc) - timedelta(hours=25),
    }
    token = pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    with pytest.raises(pyjwt.ExpiredSignatureError):
        from app.services.auth_service import decode_token
        decode_token(token)


@pytest.mark.asyncio
async def test_register_user():
    from app.database import AsyncSessionLocal, init_db
    await init_db()
    from app.services.auth_service import register_user
    async with AsyncSessionLocal() as db:
        email = f"test-{uuid.uuid4().hex[:8]}@test.com"
        user = await register_user(db, email, "password123", "Test User")
        assert user.email == email.lower()
        assert user.name == "Test User"
        assert user.role == "user"
        assert user.id is not None


@pytest.mark.asyncio
async def test_register_duplicate_email():
    from fastapi import HTTPException
    from app.database import AsyncSessionLocal, init_db
    await init_db()
    from app.services.auth_service import register_user
    async with AsyncSessionLocal() as db:
        email = f"dup-{uuid.uuid4().hex[:8]}@test.com"
        await register_user(db, email, "password123", "First")
        with pytest.raises(HTTPException) as exc_info:
            await register_user(db, email, "password456", "Second")
        assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_authenticate_user_success():
    from app.database import AsyncSessionLocal, init_db
    await init_db()
    from app.services.auth_service import register_user, authenticate_user
    async with AsyncSessionLocal() as db:
        email = f"auth-{uuid.uuid4().hex[:8]}@test.com"
        await register_user(db, email, "mypassword", "Auth User")
        user = await authenticate_user(db, email, "mypassword")
        assert user.email == email.lower()


@pytest.mark.asyncio
async def test_authenticate_user_wrong_password():
    from fastapi import HTTPException
    from app.database import AsyncSessionLocal, init_db
    await init_db()
    from app.services.auth_service import register_user, authenticate_user
    async with AsyncSessionLocal() as db:
        email = f"wrong-{uuid.uuid4().hex[:8]}@test.com"
        await register_user(db, email, "correct", "Wrong User")
        with pytest.raises(HTTPException) as exc_info:
            await authenticate_user(db, email, "incorrect")
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_authenticate_nonexistent_email():
    from fastapi import HTTPException
    from app.database import AsyncSessionLocal, init_db
    await init_db()
    from app.services.auth_service import authenticate_user
    async with AsyncSessionLocal() as db:
        with pytest.raises(HTTPException) as exc_info:
            await authenticate_user(db, "nonexistent@test.com", "anything")
        assert exc_info.value.status_code == 401


# Test email service
def test_email_template_welcome():
    from app.services.email_service import template_welcome
    msg = template_welcome("Jean", "jean@test.com")
    assert msg.to == "jean@test.com"
    assert "Bienvenue" in msg.subject
    assert "Jean" in msg.html
    assert "abonnement" in msg.html or "one-shot" in msg.html


def test_email_template_quota_warning():
    from app.services.email_service import template_quota_warning
    msg = template_quota_warning("Jean", "jean@test.com", 75, 15, "Basic")
    assert "75%" in msg.subject
    assert "15 minutes" in msg.html


def test_email_template_account_deleted():
    from app.services.email_service import template_account_deleted
    msg = template_account_deleted("Jean", "jean@test.com")
    assert "supprimé" in msg.subject.lower() or "supprime" in msg.subject.lower()
    assert "RGPD" in msg.html


def test_email_send_stub():
    from app.services.email_service import send_email, template_welcome
    msg = template_welcome("Test", "test@test.com")
    result = send_email(msg)
    assert result is True  # Stub mode always succeeds
