"""Database configuration and Supabase client."""

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    """Get cached Supabase client instance."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)


def get_database_url() -> str:
    """Get the database URL for direct PostgreSQL connections."""
    return get_settings().database_url
