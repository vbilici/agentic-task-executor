"""Agent tools - Web search, calculator, datetime, artifacts, and other execution tools."""

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
from app.agent.tools.web_search import web_search

# All available tools for the execution agent
ALL_TOOLS = [
    web_search,
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

__all__ = [
    "web_search",
    "calculator",
    "get_current_datetime",
    "format_date",
    "calculate_date_difference",
    "add_time_to_date",
    "get_day_of_week",
    "create_artifact",
    "read_artifact",
    "list_artifacts",
    "ALL_TOOLS",
]
