from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

import os
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./audio2k.db")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate: add profile column to existing tables if missing
        for table in ["transcriptions", "jobs"]:
            try:
                await conn.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN profile VARCHAR DEFAULT 'generic'")
                )
            except Exception:
                pass  # Column already exists
