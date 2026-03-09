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
        # Migrate: add columns to existing tables if missing
        migrations = [
            ("transcriptions", "profile", "VARCHAR DEFAULT 'generic'"),
            ("jobs", "profile", "VARCHAR DEFAULT 'generic'"),
            # v5 migrations
            ("jobs", "priority", "VARCHAR DEFAULT 'P1'"),
            ("jobs", "estimated_seconds", "FLOAT"),
            ("jobs", "error_message", "TEXT"),
            ("jobs", "preset_id", "VARCHAR"),
            ("transcriptions", "audio_type", "VARCHAR"),
            # v5.x migrations
            ("transcriptions", "confidence_scores", "TEXT"),
            # v6 migrations
            ("jobs", "source_type", "VARCHAR DEFAULT 'file'"),
            # v7.1 migrations
            ("transcriptions", "processing_info", "TEXT"),
            ("transcriptions", "oneshot_order_id", "VARCHAR"),
            # v7.2 migrations — stripe columns
            ("user_subscriptions", "stripe_customer_id", "VARCHAR"),
            ("user_subscriptions", "stripe_subscription_id", "VARCHAR"),
            ("oneshot_orders", "stripe_session_id", "VARCHAR"),
        ]
        for table, column, col_type in migrations:
            try:
                await conn.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
                )
            except Exception:
                pass  # Column already exists

    # v7: seed plans
    from app.services.subscription_service import seed_plans
    async with AsyncSessionLocal() as session:
        await seed_plans(session)
