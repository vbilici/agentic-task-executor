"""Tests for calculator tool (T036-T040).

Tests the safe mathematical expression evaluator including:
- Basic arithmetic operations
- Operator precedence
- Mathematical functions
- Error handling for invalid expressions
"""

import pytest


class TestCalculatorBasicArithmetic:
    """Test basic arithmetic operations (T037)."""

    def test_addition(self):
        """Calculator handles addition correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "2 + 2"}) == "4"
        assert calculator.invoke({"expression": "100 + 200"}) == "300"
        assert calculator.invoke({"expression": "0 + 0"}) == "0"

    def test_subtraction(self):
        """Calculator handles subtraction correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "10 - 3"}) == "7"
        assert calculator.invoke({"expression": "5 - 10"}) == "-5"
        assert calculator.invoke({"expression": "0 - 0"}) == "0"

    def test_multiplication(self):
        """Calculator handles multiplication correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "5 * 6"}) == "30"
        assert calculator.invoke({"expression": "0 * 100"}) == "0"
        assert calculator.invoke({"expression": "-3 * 4"}) == "-12"

    def test_division(self):
        """Calculator handles division correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "20 / 4"}) == "5"
        assert calculator.invoke({"expression": "10 / 4"}) == "2.5"
        assert calculator.invoke({"expression": "1 / 3"}) == "0.3333333333"

    def test_floor_division(self):
        """Calculator handles floor division correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "10 // 3"}) == "3"
        assert calculator.invoke({"expression": "20 // 4"}) == "5"

    def test_modulo(self):
        """Calculator handles modulo correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "10 % 3"}) == "1"
        assert calculator.invoke({"expression": "20 % 5"}) == "0"

    def test_power(self):
        """Calculator handles exponentiation correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "2 ** 3"}) == "8"
        assert calculator.invoke({"expression": "5 ** 2"}) == "25"
        assert calculator.invoke({"expression": "2 ** 10"}) == "1024"


class TestCalculatorPrecedence:
    """Test operator precedence (T038)."""

    def test_multiplication_before_addition(self):
        """Multiplication has higher precedence than addition."""
        from app.agent.tools.calculator import calculator

        # 2 + 3 * 4 should be 2 + 12 = 14, not (2 + 3) * 4 = 20
        assert calculator.invoke({"expression": "2 + 3 * 4"}) == "14"

    def test_parentheses_override_precedence(self):
        """Parentheses override default precedence."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "(2 + 3) * 4"}) == "20"
        assert calculator.invoke({"expression": "10 / (2 + 3)"}) == "2"

    def test_nested_parentheses(self):
        """Nested parentheses work correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "((2 + 3) * 4) + 1"}) == "21"
        assert calculator.invoke({"expression": "2 * (3 + (4 * 5))"}) == "46"

    def test_power_right_associative(self):
        """Power operator evaluation."""
        from app.agent.tools.calculator import calculator

        # 2 ** 3 ** 2 should be 2 ** 9 = 512 (right-to-left)
        result = calculator.invoke({"expression": "2 ** 3 ** 2"})
        assert result == "512"


class TestCalculatorFunctions:
    """Test mathematical functions (T039)."""

    def test_sqrt(self):
        """Square root function works correctly."""
        from app.agent.tools.calculator import calculator

        result = calculator.invoke({"expression": "sqrt(16)"})
        assert float(result) == 4.0

        result = calculator.invoke({"expression": "sqrt(2)"})
        assert abs(float(result) - 1.4142135624) < 0.0001

    def test_pow_function(self):
        """Power function works correctly."""
        from app.agent.tools.calculator import calculator

        result = calculator.invoke({"expression": "pow(2, 3)"})
        assert float(result) == 8.0

        result = calculator.invoke({"expression": "pow(10, 2)"})
        assert float(result) == 100.0

    def test_abs(self):
        """Absolute value function works correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "abs(-5)"}) == "5"
        assert calculator.invoke({"expression": "abs(5)"}) == "5"

    def test_round(self):
        """Round function works correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "round(3.7)"}) == "4"
        assert calculator.invoke({"expression": "round(3.2)"}) == "3"

    def test_floor_ceil(self):
        """Floor and ceiling functions work correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "floor(3.9)"}) == "3"
        assert calculator.invoke({"expression": "ceil(3.1)"}) == "4"

    def test_min_max(self):
        """Min and max functions work correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "min(3, 5)"}) == "3"
        assert calculator.invoke({"expression": "max(3, 5)"}) == "5"

    def test_trigonometric_functions(self):
        """Trigonometric functions work correctly."""
        from app.agent.tools.calculator import calculator
        import math

        # sin(0) = 0
        result = calculator.invoke({"expression": "sin(0)"})
        assert float(result) == 0.0

        # cos(0) = 1
        result = calculator.invoke({"expression": "cos(0)"})
        assert float(result) == 1.0

        # sin(pi/2) = 1
        result = calculator.invoke({"expression": "sin(pi/2)"})
        assert abs(float(result) - 1.0) < 0.0001

    def test_logarithmic_functions(self):
        """Logarithmic functions work correctly."""
        from app.agent.tools.calculator import calculator

        # log(e) = 1
        result = calculator.invoke({"expression": "log(e)"})
        assert abs(float(result) - 1.0) < 0.0001

        # log10(100) = 2
        result = calculator.invoke({"expression": "log10(100)"})
        assert float(result) == 2.0

    def test_exp(self):
        """Exponential function works correctly."""
        from app.agent.tools.calculator import calculator
        import math

        result = calculator.invoke({"expression": "exp(1)"})
        assert abs(float(result) - math.e) < 0.0001


class TestCalculatorConstants:
    """Test mathematical constants."""

    def test_pi_constant(self):
        """Pi constant is available."""
        from app.agent.tools.calculator import calculator
        import math

        result = calculator.invoke({"expression": "pi"})
        assert abs(float(result) - math.pi) < 0.0001

    def test_e_constant(self):
        """Euler's number e is available."""
        from app.agent.tools.calculator import calculator
        import math

        result = calculator.invoke({"expression": "e"})
        assert abs(float(result) - math.e) < 0.0001

    def test_constants_in_expressions(self):
        """Constants can be used in expressions."""
        from app.agent.tools.calculator import calculator

        # 2 * pi
        result = calculator.invoke({"expression": "2 * pi"})
        assert float(result) > 6.28  # ~6.283


class TestCalculatorErrorHandling:
    """Test error handling for invalid expressions (T040)."""

    def test_invalid_expression_syntax(self):
        """Invalid syntax returns error message."""
        from app.agent.tools.calculator import calculator

        result = calculator.invoke({"expression": "invalid"})
        assert "Error" in result or "error" in result.lower()

    def test_unknown_function(self):
        """Unknown function returns error."""
        from app.agent.tools.calculator import calculator

        result = calculator.invoke({"expression": "unknown_func(5)"})
        assert "Error" in result or "error" in result.lower()

    def test_division_by_zero(self):
        """Division by zero returns error."""
        from app.agent.tools.calculator import calculator

        result = calculator.invoke({"expression": "10 / 0"})
        assert "Error" in result or "error" in result.lower() or "zero" in result.lower()

    def test_empty_expression(self):
        """Empty expression returns error."""
        from app.agent.tools.calculator import calculator

        result = calculator.invoke({"expression": ""})
        assert "Error" in result or "error" in result.lower()

    def test_whitespace_only_expression(self):
        """Whitespace-only expression returns error."""
        from app.agent.tools.calculator import calculator

        result = calculator.invoke({"expression": "   "})
        assert "Error" in result or "error" in result.lower()

    def test_exponent_too_large(self):
        """Exponent larger than limit returns error."""
        from app.agent.tools.calculator import calculator

        result = calculator.invoke({"expression": "2 ** 1001"})
        assert "Error" in result or "error" in result.lower()

    def test_malformed_parentheses(self):
        """Malformed parentheses returns error."""
        from app.agent.tools.calculator import calculator

        result = calculator.invoke({"expression": "(2 + 3"})
        assert "Error" in result or "error" in result.lower()


class TestCalculatorUnaryOperators:
    """Test unary operators."""

    def test_negative_numbers(self):
        """Negative numbers work correctly."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "-5"}) == "-5"
        assert calculator.invoke({"expression": "-5 + 3"}) == "-2"
        assert calculator.invoke({"expression": "5 * -3"}) == "-15"

    def test_positive_unary(self):
        """Positive unary operator works."""
        from app.agent.tools.calculator import calculator

        assert calculator.invoke({"expression": "+5"}) == "5"


class TestSafeEvaluator:
    """Test SafeEvaluator class directly."""

    def test_rejects_unsafe_operations(self):
        """SafeEvaluator rejects unsafe operations."""
        from app.agent.tools.calculator import safe_eval

        # Attribute access should be rejected
        with pytest.raises(ValueError):
            safe_eval("__import__('os')")

        # String operations should be rejected
        with pytest.raises(ValueError):
            safe_eval("'hello'")

    def test_accepts_safe_operations(self):
        """SafeEvaluator accepts safe operations."""
        from app.agent.tools.calculator import safe_eval

        assert safe_eval("2 + 2") == 4.0
        assert safe_eval("sqrt(16)") == 4.0
