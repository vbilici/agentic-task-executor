"""Agent tools - Web search, calculator, datetime, artifacts, and other execution tools."""

from typing import Any

from app.agent.tools.calculator import calculator
from app.agent.tools.create_artifact import create_artifact
from app.agent.tools.datetime_tool import (
    add_time_to_date,
    calculate_date_difference,
    format_date,
    get_current_datetime,
    get_day_of_week,
)
from app.agent.tools.read_artifact import list_artifacts, read_artifact
from app.agent.tools.web_fetch import web_fetch
from app.agent.tools.web_search import web_search


def get_available_tools() -> list[Any]:
    """Get tools available based on configuration.

    Returns all tools that can be used by the execution agent.
    Tavily-based tools (web_search, web_fetch) are only included
    if TAVILY_API_KEY is configured.
    """
    from app.core.config import get_settings

    settings = get_settings()

    # Base tools always available
    tools: list[Any] = [
        calculator,
        get_current_datetime,
        format_date,
        calculate_date_difference,
        add_time_to_date,
        get_day_of_week,
        create_artifact,
        read_artifact,
        list_artifacts,
    ]

    # Add Tavily tools only if API key is configured
    if settings.tavily_api_key:
        tools.insert(0, web_search)
        tools.insert(1, web_fetch)

    return tools


__all__ = [
    "web_search",
    "web_fetch",
    "calculator",
    "get_current_datetime",
    "format_date",
    "calculate_date_difference",
    "add_time_to_date",
    "get_day_of_week",
    "create_artifact",
    "read_artifact",
    "list_artifacts",
    "get_available_tools",
]
