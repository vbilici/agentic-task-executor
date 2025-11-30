"""Calculator tool for basic math operations."""

import ast
import math
import operator
from typing import Any

from langchain_core.tools import tool

# Safe operators allowed in expressions
SAFE_OPERATORS: dict[type, Any] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

# Safe math functions allowed in expressions
SAFE_FUNCTIONS: dict[str, Any] = {
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sum": sum,
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "floor": math.floor,
    "ceil": math.ceil,
    "pow": pow,
}

# Safe constants
SAFE_CONSTANTS: dict[str, float] = {
    "pi": math.pi,
    "e": math.e,
}


class SafeEvaluator(ast.NodeVisitor):
    """Safe expression evaluator that only allows basic math operations."""

    def visit(self, node: ast.AST) -> Any:
        """Visit a node and evaluate it safely."""
        return super().visit(node)

    def visit_Expression(self, node: ast.Expression) -> Any:
        """Evaluate an expression node."""
        return self.visit(node.body)

    def visit_Constant(self, node: ast.Constant) -> Any:
        """Evaluate a constant (number)."""
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError(f"Unsupported constant type: {type(node.value)}")

    def visit_Num(self, node: ast.Num) -> Any:
        """Evaluate a number (legacy AST node for older Python)."""
        return node.n

    def visit_Name(self, node: ast.Name) -> Any:
        """Evaluate a named constant (pi, e)."""
        if node.id in SAFE_CONSTANTS:
            return SAFE_CONSTANTS[node.id]
        raise ValueError(f"Unknown variable: {node.id}")

    def visit_BinOp(self, node: ast.BinOp) -> Any:
        """Evaluate a binary operation."""
        op_type = type(node.op)
        if op_type not in SAFE_OPERATORS:
            raise ValueError(f"Unsupported operator: {op_type.__name__}")

        left = self.visit(node.left)
        right = self.visit(node.right)

        # Prevent division by zero
        if op_type in (ast.Div, ast.FloorDiv, ast.Mod) and right == 0:
            raise ValueError("Division by zero is not allowed")

        # Limit exponentiation to prevent huge numbers
        if op_type == ast.Pow and isinstance(right, (int, float)) and abs(right) > 1000:
            raise ValueError("Exponent too large (max 1000)")

        return SAFE_OPERATORS[op_type](left, right)

    def visit_UnaryOp(self, node: ast.UnaryOp) -> Any:
        """Evaluate a unary operation."""
        op_type = type(node.op)
        if op_type not in SAFE_OPERATORS:
            raise ValueError(f"Unsupported unary operator: {op_type.__name__}")

        operand = self.visit(node.operand)
        return SAFE_OPERATORS[op_type](operand)

    def visit_Call(self, node: ast.Call) -> Any:
        """Evaluate a function call."""
        if not isinstance(node.func, ast.Name):
            raise ValueError("Only simple function calls are allowed")

        func_name = node.func.id
        if func_name not in SAFE_FUNCTIONS:
            raise ValueError(f"Unknown function: {func_name}")

        args = [self.visit(arg) for arg in node.args]
        return SAFE_FUNCTIONS[func_name](*args)

    def generic_visit(self, node: ast.AST) -> Any:
        """Reject any other AST node types."""
        raise ValueError(f"Unsupported expression: {type(node).__name__}")


def safe_eval(expression: str) -> float:
    """Safely evaluate a mathematical expression.

    Args:
        expression: A mathematical expression string

    Returns:
        The result of the expression

    Raises:
        ValueError: If the expression contains unsafe operations
        SyntaxError: If the expression is malformed
    """
    # Parse the expression
    tree = ast.parse(expression, mode="eval")

    # Evaluate safely
    evaluator = SafeEvaluator()
    result = evaluator.visit(tree)

    return float(result)


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression.

    Use this tool when you need to perform calculations. Supports basic arithmetic
    operations (+, -, *, /, //, %, **) and common math functions.

    Supported functions:
    - Basic: abs, round, min, max, sum
    - Math: sqrt, sin, cos, tan, log, log10, exp, floor, ceil, pow

    Supported constants:
    - pi (3.14159...)
    - e (2.71828...)

    Args:
        expression: A mathematical expression to evaluate.
                   Examples: "2 + 2", "sqrt(16)", "sin(pi/2)", "2**10"

    Returns:
        The result of the calculation as a string
    """
    try:
        # Clean up the expression
        expression = expression.strip()

        if not expression:
            return "Error: Empty expression provided"

        result = safe_eval(expression)

        # Format the result nicely
        if result == int(result):
            return str(int(result))
        return str(round(result, 10))

    except SyntaxError:
        return f"Error: Invalid expression syntax: {expression}"
    except ValueError as e:
        return f"Error: {e}"
    except ZeroDivisionError:
        return "Error: Division by zero"
    except OverflowError:
        return "Error: Result is too large to compute"
    except Exception as e:
        return f"Error calculating expression: {e}"
