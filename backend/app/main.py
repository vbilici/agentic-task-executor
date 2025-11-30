"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.services.agent_service import agent_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan handler."""
    # Startup
    settings = get_settings()
    print(f"Starting Libra API in {settings.environment} mode")

    # Initialize agent service
    await agent_service.initialize()

    yield

    # Shutdown
    print("Shutting down Libra API")
    await agent_service.close()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    # Trigger settings validation at startup
    _ = get_settings()

    app = FastAPI(
        title="Libra - Agent-Driven TODO Executor",
        description="API for managing sessions, tasks, artifacts, and data items with AI agent execution",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    from app.api.artifacts import router as artifacts_router
    from app.api.chat import router as chat_router
    from app.api.execute import router as execute_router
    from app.api.health import router as health_router
    from app.api.sessions import router as sessions_router

    app.include_router(health_router)
    app.include_router(sessions_router)
    app.include_router(chat_router)
    app.include_router(execute_router)
    app.include_router(artifacts_router)

    return app


app = create_app()
