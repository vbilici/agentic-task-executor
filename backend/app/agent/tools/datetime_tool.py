"""Datetime tool for date and time operations."""

from datetime import datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from langchain_core.tools import tool

# Common date formats
DATE_FORMATS: dict[str, str] = {
    "iso": "%Y-%m-%d",
    "us": "%m/%d/%Y",
    "eu": "%d/%m/%Y",
    "long": "%B %d, %Y",
    "short": "%b %d, %Y",
    "full": "%A, %B %d, %Y",
}

TIME_FORMATS: dict[str, str] = {
    "24h": "%H:%M:%S",
    "12h": "%I:%M:%S %p",
    "short_24h": "%H:%M",
    "short_12h": "%I:%M %p",
}

DATETIME_FORMATS: dict[str, str] = {
    "iso": "%Y-%m-%dT%H:%M:%S",
    "full": "%A, %B %d, %Y at %I:%M %p",
    "compact": "%Y-%m-%d %H:%M:%S",
}


@tool
def get_current_datetime(
    timezone: str = "UTC",
    format: Literal["iso", "full", "compact", "date_only", "time_only"] = "iso",
) -> str:
    """Get the current date and time.

    Use this tool when you need to know the current date, time, or both.

    Args:
        timezone: The timezone to use (e.g., "UTC", "US/Eastern", "Europe/London").
                 Default is "UTC".
        format: The output format. Options:
               - "iso": ISO 8601 format (2024-01-15T14:30:00)
               - "full": Full human-readable (Monday, January 15, 2024 at 02:30 PM)
               - "compact": Compact format (2024-01-15 14:30:00)
               - "date_only": Just the date (2024-01-15)
               - "time_only": Just the time (14:30:00)

    Returns:
        The current date/time as a formatted string
    """
    try:
        tz = ZoneInfo(timezone)
        now = datetime.now(tz)

        if format == "iso":
            return now.strftime(DATETIME_FORMATS["iso"])
        elif format == "full":
            return now.strftime(DATETIME_FORMATS["full"])
        elif format == "compact":
            return now.strftime(DATETIME_FORMATS["compact"])
        elif format == "date_only":
            return now.strftime(DATE_FORMATS["iso"])
        elif format == "time_only":
            return now.strftime(TIME_FORMATS["24h"])
        else:
            return now.isoformat()

    except Exception as e:
        return f"Error getting current datetime: {e}"


@tool
def format_date(
    date_string: str,
    input_format: str = "%Y-%m-%d",
    output_format: Literal["iso", "us", "eu", "long", "short", "full"] = "long",
) -> str:
    """Format a date string into a different format.

    Use this tool when you need to convert a date from one format to another.

    Args:
        date_string: The date string to format (e.g., "2024-01-15")
        input_format: The format of the input date (strftime format).
                     Default is "%Y-%m-%d" (ISO format).
        output_format: The desired output format. Options:
                      - "iso": 2024-01-15
                      - "us": 01/15/2024
                      - "eu": 15/01/2024
                      - "long": January 15, 2024
                      - "short": Jan 15, 2024
                      - "full": Monday, January 15, 2024

    Returns:
        The formatted date string
    """
    try:
        date = datetime.strptime(date_string, input_format)
        format_str = DATE_FORMATS.get(output_format, DATE_FORMATS["iso"])
        return date.strftime(format_str)

    except ValueError as e:
        return f"Error parsing date: {e}"
    except Exception as e:
        return f"Error formatting date: {e}"


@tool
def calculate_date_difference(
    date1: str,
    date2: str,
    date_format: str = "%Y-%m-%d",
    unit: Literal["days", "weeks", "months", "years"] = "days",
) -> str:
    """Calculate the difference between two dates.

    Use this tool when you need to find out how many days, weeks, months,
    or years are between two dates.

    Args:
        date1: The first date string
        date2: The second date string
        date_format: The format of both dates (strftime format).
                    Default is "%Y-%m-%d" (ISO format).
        unit: The unit for the result. Options: "days", "weeks", "months", "years"

    Returns:
        The difference between the dates in the specified unit
    """
    try:
        d1 = datetime.strptime(date1, date_format)
        d2 = datetime.strptime(date2, date_format)

        delta = d2 - d1
        days = delta.days

        if unit == "days":
            return f"{days} days"
        elif unit == "weeks":
            weeks = days / 7
            return f"{weeks:.1f} weeks"
        elif unit == "months":
            # Approximate months (30.44 days per month)
            months = days / 30.44
            return f"{months:.1f} months"
        elif unit == "years":
            # Approximate years (365.25 days per year)
            years = days / 365.25
            return f"{years:.2f} years"
        else:
            return f"{days} days"

    except ValueError as e:
        return f"Error parsing dates: {e}"
    except Exception as e:
        return f"Error calculating date difference: {e}"


@tool
def add_time_to_date(
    date_string: str,
    days: int = 0,
    weeks: int = 0,
    months: int = 0,
    years: int = 0,
    date_format: str = "%Y-%m-%d",
) -> str:
    """Add or subtract time from a date.

    Use this tool when you need to calculate a future or past date
    by adding or subtracting days, weeks, months, or years.

    Args:
        date_string: The starting date string
        days: Number of days to add (negative to subtract)
        weeks: Number of weeks to add (negative to subtract)
        months: Number of months to add (negative to subtract)
        years: Number of years to add (negative to subtract)
        date_format: The format of the date (strftime format).
                    Default is "%Y-%m-%d" (ISO format).

    Returns:
        The resulting date in ISO format
    """
    try:
        date = datetime.strptime(date_string, date_format)

        # Add days and weeks directly
        date = date + timedelta(days=days, weeks=weeks)

        # Handle months by adjusting month and year
        if months != 0:
            new_month = date.month + months
            new_year = date.year

            # Handle month overflow/underflow
            while new_month > 12:
                new_month -= 12
                new_year += 1
            while new_month < 1:
                new_month += 12
                new_year -= 1

            # Handle day overflow for shorter months
            max_day = 31
            if new_month in (4, 6, 9, 11):
                max_day = 30
            elif new_month == 2:
                # Check leap year
                if (new_year % 4 == 0 and new_year % 100 != 0) or (new_year % 400 == 0):
                    max_day = 29
                else:
                    max_day = 28

            new_day = min(date.day, max_day)
            date = date.replace(year=new_year, month=new_month, day=new_day)

        # Handle years
        if years != 0:
            new_year = date.year + years
            # Handle Feb 29 in non-leap years
            if date.month == 2 and date.day == 29:
                if not (
                    (new_year % 4 == 0 and new_year % 100 != 0) or (new_year % 400 == 0)
                ):
                    date = date.replace(year=new_year, day=28)
                else:
                    date = date.replace(year=new_year)
            else:
                date = date.replace(year=new_year)

        return date.strftime(DATE_FORMATS["iso"])

    except ValueError as e:
        return f"Error parsing date: {e}"
    except Exception as e:
        return f"Error adding time to date: {e}"


@tool
def get_day_of_week(
    date_string: str,
    date_format: str = "%Y-%m-%d",
) -> str:
    """Get the day of the week for a given date.

    Use this tool when you need to know what day of the week
    a particular date falls on.

    Args:
        date_string: The date string to check
        date_format: The format of the date (strftime format).
                    Default is "%Y-%m-%d" (ISO format).

    Returns:
        The day of the week (e.g., "Monday", "Tuesday")
    """
    try:
        date = datetime.strptime(date_string, date_format)
        return date.strftime("%A")

    except ValueError as e:
        return f"Error parsing date: {e}"
    except Exception as e:
        return f"Error getting day of week: {e}"
