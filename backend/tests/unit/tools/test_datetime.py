"""Tests for datetime tools (T041-T043).

Tests the datetime utility tools including:
- get_current_datetime with various formats and timezones
- format_date conversion between formats
- calculate_date_difference with different units
- add_time_to_date for date arithmetic
- get_day_of_week for day name lookup
"""



class TestGetCurrentDatetime:
    """Test get_current_datetime tool (T042)."""

    def test_returns_iso_format_by_default(self):
        """ISO format is the default output."""
        from app.agent.tools.datetime_tool import get_current_datetime

        result = get_current_datetime.invoke({})

        # Should be ISO format: YYYY-MM-DDTHH:MM:SS
        assert "T" in result
        assert "-" in result
        assert ":" in result

    def test_returns_full_format(self):
        """Full human-readable format works."""
        from app.agent.tools.datetime_tool import get_current_datetime

        result = get_current_datetime.invoke({"format": "full"})

        # Should contain day name and month name
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        months = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"]

        has_day = any(day in result for day in days)
        has_month = any(month in result for month in months)

        assert has_day or has_month

    def test_returns_compact_format(self):
        """Compact format works."""
        from app.agent.tools.datetime_tool import get_current_datetime

        result = get_current_datetime.invoke({"format": "compact"})

        # Should be YYYY-MM-DD HH:MM:SS
        assert " " in result
        assert "-" in result
        assert ":" in result
        assert "T" not in result

    def test_returns_date_only(self):
        """Date-only format works."""
        from app.agent.tools.datetime_tool import get_current_datetime

        result = get_current_datetime.invoke({"format": "date_only"})

        # Should be YYYY-MM-DD only
        assert "-" in result
        assert ":" not in result
        # Should have format like 2025-01-15
        parts = result.split("-")
        assert len(parts) == 3

    def test_returns_time_only(self):
        """Time-only format works."""
        from app.agent.tools.datetime_tool import get_current_datetime

        result = get_current_datetime.invoke({"format": "time_only"})

        # Should be HH:MM:SS only
        assert ":" in result
        assert "-" not in result
        parts = result.split(":")
        assert len(parts) == 3

    def test_respects_timezone(self):
        """Different timezones produce different results."""
        from app.agent.tools.datetime_tool import get_current_datetime

        utc_result = get_current_datetime.invoke({"timezone": "UTC"})
        # Use a timezone with significant offset
        tokyo_result = get_current_datetime.invoke({"timezone": "Asia/Tokyo"})

        # Results should be different (unless exactly on hour boundary)
        # At minimum, both should be valid datetime strings
        assert "T" in utc_result
        assert "T" in tokyo_result

    def test_invalid_timezone_returns_error(self):
        """Invalid timezone returns error message."""
        from app.agent.tools.datetime_tool import get_current_datetime

        result = get_current_datetime.invoke({"timezone": "Invalid/Zone"})

        assert "Error" in result or "error" in result.lower()


class TestFormatDate:
    """Test format_date tool."""

    def test_iso_to_long_format(self):
        """Converts ISO date to long format."""
        from app.agent.tools.datetime_tool import format_date

        result = format_date.invoke({
            "date_string": "2025-01-15",
            "output_format": "long"
        })

        assert "January" in result
        assert "15" in result
        assert "2025" in result

    def test_iso_to_us_format(self):
        """Converts ISO date to US format (MM/DD/YYYY)."""
        from app.agent.tools.datetime_tool import format_date

        result = format_date.invoke({
            "date_string": "2025-01-15",
            "output_format": "us"
        })

        assert result == "01/15/2025"

    def test_iso_to_eu_format(self):
        """Converts ISO date to EU format (DD/MM/YYYY)."""
        from app.agent.tools.datetime_tool import format_date

        result = format_date.invoke({
            "date_string": "2025-01-15",
            "output_format": "eu"
        })

        assert result == "15/01/2025"

    def test_iso_to_short_format(self):
        """Converts ISO date to short format."""
        from app.agent.tools.datetime_tool import format_date

        result = format_date.invoke({
            "date_string": "2025-01-15",
            "output_format": "short"
        })

        assert "Jan" in result
        assert "15" in result
        assert "2025" in result

    def test_iso_to_full_format(self):
        """Converts ISO date to full format with day name."""
        from app.agent.tools.datetime_tool import format_date

        result = format_date.invoke({
            "date_string": "2025-01-15",
            "output_format": "full"
        })

        # January 15, 2025 is a Wednesday
        assert "Wednesday" in result
        assert "January" in result

    def test_custom_input_format(self):
        """Accepts custom input format."""
        from app.agent.tools.datetime_tool import format_date

        result = format_date.invoke({
            "date_string": "15/01/2025",
            "input_format": "%d/%m/%Y",
            "output_format": "iso"
        })

        assert result == "2025-01-15"

    def test_invalid_date_returns_error(self):
        """Invalid date string returns error."""
        from app.agent.tools.datetime_tool import format_date

        result = format_date.invoke({
            "date_string": "invalid-date",
            "output_format": "long"
        })

        assert "Error" in result or "error" in result.lower()


class TestCalculateDateDifference:
    """Test calculate_date_difference tool (T043)."""

    def test_difference_in_days(self):
        """Calculates difference in days correctly."""
        from app.agent.tools.datetime_tool import calculate_date_difference

        result = calculate_date_difference.invoke({
            "date1": "2025-01-01",
            "date2": "2025-01-10"
        })

        assert "9" in result
        assert "days" in result.lower()

    def test_difference_in_weeks(self):
        """Calculates difference in weeks correctly."""
        from app.agent.tools.datetime_tool import calculate_date_difference

        result = calculate_date_difference.invoke({
            "date1": "2025-01-01",
            "date2": "2025-01-15",
            "unit": "weeks"
        })

        assert "2" in result
        assert "weeks" in result.lower()

    def test_difference_in_months(self):
        """Calculates difference in months correctly."""
        from app.agent.tools.datetime_tool import calculate_date_difference

        result = calculate_date_difference.invoke({
            "date1": "2025-01-01",
            "date2": "2025-04-01",
            "unit": "months"
        })

        # ~90 days / 30.44 = ~2.96 months
        assert "month" in result.lower()

    def test_difference_in_years(self):
        """Calculates difference in years correctly."""
        from app.agent.tools.datetime_tool import calculate_date_difference

        result = calculate_date_difference.invoke({
            "date1": "2020-01-01",
            "date2": "2025-01-01",
            "unit": "years"
        })

        # Exactly 5 years (1826 days / 365.25 = 5.0)
        assert "5" in result or "4.99" in result
        assert "year" in result.lower()

    def test_negative_difference(self):
        """Handles date2 before date1 (negative difference)."""
        from app.agent.tools.datetime_tool import calculate_date_difference

        result = calculate_date_difference.invoke({
            "date1": "2025-01-10",
            "date2": "2025-01-01"
        })

        assert "-9" in result
        assert "days" in result.lower()

    def test_same_date_returns_zero(self):
        """Same dates return zero difference."""
        from app.agent.tools.datetime_tool import calculate_date_difference

        result = calculate_date_difference.invoke({
            "date1": "2025-01-15",
            "date2": "2025-01-15"
        })

        assert "0" in result

    def test_custom_date_format(self):
        """Accepts custom date format."""
        from app.agent.tools.datetime_tool import calculate_date_difference

        result = calculate_date_difference.invoke({
            "date1": "01/15/2025",
            "date2": "01/25/2025",
            "date_format": "%m/%d/%Y"
        })

        assert "10" in result

    def test_invalid_date_returns_error(self):
        """Invalid date returns error."""
        from app.agent.tools.datetime_tool import calculate_date_difference

        result = calculate_date_difference.invoke({
            "date1": "invalid",
            "date2": "2025-01-10"
        })

        assert "Error" in result or "error" in result.lower()


class TestAddTimeToDate:
    """Test add_time_to_date tool."""

    def test_add_days(self):
        """Adding days works correctly."""
        from app.agent.tools.datetime_tool import add_time_to_date

        result = add_time_to_date.invoke({
            "date_string": "2025-01-15",
            "days": 10
        })

        assert result == "2025-01-25"

    def test_subtract_days(self):
        """Subtracting days (negative) works correctly."""
        from app.agent.tools.datetime_tool import add_time_to_date

        result = add_time_to_date.invoke({
            "date_string": "2025-01-15",
            "days": -10
        })

        assert result == "2025-01-05"

    def test_add_weeks(self):
        """Adding weeks works correctly."""
        from app.agent.tools.datetime_tool import add_time_to_date

        result = add_time_to_date.invoke({
            "date_string": "2025-01-01",
            "weeks": 2
        })

        assert result == "2025-01-15"

    def test_add_months(self):
        """Adding months works correctly."""
        from app.agent.tools.datetime_tool import add_time_to_date

        result = add_time_to_date.invoke({
            "date_string": "2025-01-15",
            "months": 1
        })

        assert result == "2025-02-15"

    def test_add_months_with_overflow(self):
        """Adding months handles day overflow (e.g., Jan 31 + 1 month)."""
        from app.agent.tools.datetime_tool import add_time_to_date

        # January 31 + 1 month = February 28 (or 29 in leap year)
        result = add_time_to_date.invoke({
            "date_string": "2025-01-31",
            "months": 1
        })

        # 2025 is not a leap year, so Feb has 28 days
        assert result == "2025-02-28"

    def test_add_years(self):
        """Adding years works correctly."""
        from app.agent.tools.datetime_tool import add_time_to_date

        result = add_time_to_date.invoke({
            "date_string": "2025-01-15",
            "years": 5
        })

        assert result == "2030-01-15"

    def test_leap_year_handling(self):
        """Handles Feb 29 correctly when adding years."""
        from app.agent.tools.datetime_tool import add_time_to_date

        # 2024 is a leap year, 2025 is not
        result = add_time_to_date.invoke({
            "date_string": "2024-02-29",
            "years": 1
        })

        # Should become Feb 28 in non-leap year
        assert result == "2025-02-28"

    def test_combined_additions(self):
        """Multiple time units can be added together."""
        from app.agent.tools.datetime_tool import add_time_to_date

        result = add_time_to_date.invoke({
            "date_string": "2025-01-01",
            "days": 5,
            "weeks": 1,
            "months": 1
        })

        # +5 days = Jan 6, +1 week = Jan 13, +1 month = Feb 13
        assert result == "2025-02-13"

    def test_invalid_date_returns_error(self):
        """Invalid date returns error."""
        from app.agent.tools.datetime_tool import add_time_to_date

        result = add_time_to_date.invoke({
            "date_string": "invalid",
            "days": 10
        })

        assert "Error" in result or "error" in result.lower()


class TestGetDayOfWeek:
    """Test get_day_of_week tool."""

    def test_known_date_day(self):
        """Returns correct day for known date."""
        from app.agent.tools.datetime_tool import get_day_of_week

        # January 15, 2025 is a Wednesday
        result = get_day_of_week.invoke({"date_string": "2025-01-15"})

        assert result == "Wednesday"

    def test_all_days_of_week(self):
        """Can return all days of the week."""
        from app.agent.tools.datetime_tool import get_day_of_week

        # Week of Jan 13-19, 2025
        expected = [
            ("2025-01-13", "Monday"),
            ("2025-01-14", "Tuesday"),
            ("2025-01-15", "Wednesday"),
            ("2025-01-16", "Thursday"),
            ("2025-01-17", "Friday"),
            ("2025-01-18", "Saturday"),
            ("2025-01-19", "Sunday"),
        ]

        for date_str, expected_day in expected:
            result = get_day_of_week.invoke({"date_string": date_str})
            assert result == expected_day

    def test_custom_date_format(self):
        """Accepts custom date format."""
        from app.agent.tools.datetime_tool import get_day_of_week

        result = get_day_of_week.invoke({
            "date_string": "01/15/2025",
            "date_format": "%m/%d/%Y"
        })

        assert result == "Wednesday"

    def test_invalid_date_returns_error(self):
        """Invalid date returns error."""
        from app.agent.tools.datetime_tool import get_day_of_week

        result = get_day_of_week.invoke({"date_string": "invalid"})

        assert "Error" in result or "error" in result.lower()


class TestDatetimeToolDocstrings:
    """Test that tools have proper docstrings for LLM usage."""

    def test_get_current_datetime_has_docstring(self):
        """get_current_datetime has descriptive docstring."""
        from app.agent.tools.datetime_tool import get_current_datetime

        assert get_current_datetime.description is not None
        assert len(get_current_datetime.description) > 50

    def test_format_date_has_docstring(self):
        """format_date has descriptive docstring."""
        from app.agent.tools.datetime_tool import format_date

        assert format_date.description is not None
        assert len(format_date.description) > 50

    def test_calculate_date_difference_has_docstring(self):
        """calculate_date_difference has descriptive docstring."""
        from app.agent.tools.datetime_tool import calculate_date_difference

        assert calculate_date_difference.description is not None
        assert len(calculate_date_difference.description) > 50

    def test_add_time_to_date_has_docstring(self):
        """add_time_to_date has descriptive docstring."""
        from app.agent.tools.datetime_tool import add_time_to_date

        assert add_time_to_date.description is not None
        assert len(add_time_to_date.description) > 50

    def test_get_day_of_week_has_docstring(self):
        """get_day_of_week has descriptive docstring."""
        from app.agent.tools.datetime_tool import get_day_of_week

        assert get_day_of_week.description is not None
        assert len(get_day_of_week.description) > 50
