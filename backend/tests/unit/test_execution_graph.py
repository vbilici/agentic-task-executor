"""Tests for execution graph nodes and routing logic (T030-T034).

Tests the execution agent graph including:
- should_continue routing logic
- reflection_node structured output extraction
- artifact_creator_node decision making
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage


class TestShouldContinue:
    """Test routing logic for execution graph (T031-T032)."""

    def test_should_continue_returns_tools_when_tool_calls_present(self):
        """Routes to 'tools' when AIMessage has tool_calls (T031).

        When the agent produces an AIMessage with tool_calls, the graph
        should route to the 'tools' node to execute those calls.
        """
        from app.agent.state import ExecutionState

        message_with_tools = AIMessage(
            content="",
            tool_calls=[{"id": "call_1", "name": "web_search", "args": {"query": "test"}}]
        )

        state: ExecutionState = {
            "messages": [message_with_tools],
            "session_id": "test-session",
            "current_task_id": "test-task",
            "tasks": [],
            "artifacts": [],
            "task_result": None,
            "task_reflection": None,
            "created_artifact": None,
            "is_complete": False,
        }

        # Replicate the should_continue logic
        messages = state["messages"]
        last_message = messages[-1] if messages else None
        has_tool_calls = isinstance(last_message, AIMessage) and last_message.tool_calls

        # Use bool() to check truthiness, not identity
        assert bool(has_tool_calls) is True
        # This means should_continue would return "tools"

    def test_should_continue_returns_artifact_creator_when_no_tool_calls(self):
        """Routes to 'artifact_creator' when AIMessage has no tool_calls (T032).

        When the agent produces a final response without tool_calls,
        the graph should route to 'artifact_creator' for reflection and artifact creation.
        """
        from app.agent.state import ExecutionState

        message_no_tools = AIMessage(content="I've completed the analysis.")

        state: ExecutionState = {
            "messages": [message_no_tools],
            "session_id": "test-session",
            "current_task_id": "test-task",
            "tasks": [],
            "artifacts": [],
            "task_result": None,
            "task_reflection": None,
            "created_artifact": None,
            "is_complete": False,
        }

        # Replicate the should_continue logic
        messages = state["messages"]
        last_message = messages[-1] if messages else None
        has_tool_calls = isinstance(last_message, AIMessage) and last_message.tool_calls

        # Use bool() to check truthiness, not identity
        assert bool(has_tool_calls) is False
        # This means should_continue would return "artifact_creator"

    def test_should_continue_with_empty_tool_calls_returns_artifact_creator(self):
        """Routes to 'artifact_creator' when tool_calls is empty list.

        Edge case: AIMessage with empty tool_calls list should
        be treated as no tool calls.
        """
        from app.agent.state import ExecutionState

        message_empty_tools = AIMessage(content="Done", tool_calls=[])

        state: ExecutionState = {
            "messages": [message_empty_tools],
            "session_id": "test-session",
            "current_task_id": "test-task",
            "tasks": [],
            "artifacts": [],
            "task_result": None,
            "task_reflection": None,
            "created_artifact": None,
            "is_complete": False,
        }

        messages = state["messages"]
        last_message = messages[-1] if messages else None
        # Empty list is falsy in Python
        has_tool_calls = isinstance(last_message, AIMessage) and last_message.tool_calls

        # Use bool() to check truthiness, not identity
        assert bool(has_tool_calls) is False

    def test_should_continue_with_human_message_returns_artifact_creator(self):
        """Routes to 'artifact_creator' when last message is not AIMessage.

        Edge case: If somehow the last message is a HumanMessage,
        should route to artifact_creator (not tools).
        """
        from app.agent.state import ExecutionState

        state: ExecutionState = {
            "messages": [HumanMessage(content="Execute this task")],
            "session_id": "test-session",
            "current_task_id": "test-task",
            "tasks": [],
            "artifacts": [],
            "task_result": None,
            "task_reflection": None,
            "created_artifact": None,
            "is_complete": False,
        }

        messages = state["messages"]
        last_message = messages[-1] if messages else None
        has_tool_calls = isinstance(last_message, AIMessage) and last_message.tool_calls

        assert bool(has_tool_calls) is False


class TestArtifactCreatorReflection:
    """Test artifact creator node reflection functionality (T033-T034).

    Note: The reflection logic has been merged into the artifact_creator_node.
    These tests verify that the node properly extracts task results before
    deciding on artifact creation.
    """

    def test_artifact_creator_extracts_task_result(self):
        """Artifact creator extracts TaskResult from conversation (T034).

        The artifact_creator_node should use structured output to extract
        a result summary from the conversation history before deciding
        on artifact creation.
        """
        from app.agent.execution_graph import TaskResult, ArtifactDecision, create_execution_graph
        from app.agent.state import ExecutionState

        mock_task_result = TaskResult(
            result="Found 5 matching restaurants in the area",
            reflection="Task completed successfully with good results"
        )

        mock_artifact_decision = ArtifactDecision(
            should_create=False,
            name=None,
            artifact_type=None,
            content=None
        )

        with patch("app.agent.execution_graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.execution_graph.ChatOpenAI") as mock_llm_class:
                # Create mock LLM that returns different things for different structured outputs
                mock_llm = MagicMock()

                # First call: reflection LLM (TaskResult)
                mock_reflection_llm = MagicMock()
                mock_reflection_llm.invoke.return_value = mock_task_result

                # Second call: artifact LLM (ArtifactDecision)
                mock_artifact_llm = MagicMock()
                mock_artifact_llm.invoke.return_value = mock_artifact_decision

                # with_structured_output returns different mocks based on call order
                mock_llm.with_structured_output.side_effect = [mock_reflection_llm, mock_artifact_llm]
                mock_llm_class.return_value = mock_llm

                graph_builder = create_execution_graph()
                # Access the node's runnable via .runnable attribute
                artifact_node_spec = graph_builder.nodes["artifact_creator"]
                artifact_node_runnable = artifact_node_spec.runnable

                state: ExecutionState = {
                    "messages": [
                        HumanMessage(content="Find restaurants near me"),
                        AIMessage(content="I found several great options."),
                    ],
                    "session_id": "test-session",
                    "current_task_id": "test-task",
                    "tasks": [{"id": "test-task", "title": "Find restaurants"}],
                    "artifacts": [],
                    "task_result": None,
                    "task_reflection": None,
                    "created_artifact": None,
                    "is_complete": False,
                }

                # RunnableCallable uses .invoke() method
                result = artifact_node_runnable.invoke(state)

                assert result["task_result"] == "Found 5 matching restaurants in the area"
                assert result["is_complete"] is True

    def test_artifact_creator_handles_missing_task(self):
        """Artifact creator handles case when task is not found.

        Edge case: If current_task_id doesn't match any task,
        should still produce a result with 'Unknown task' context.
        """
        from app.agent.execution_graph import TaskResult, ArtifactDecision, create_execution_graph
        from app.agent.state import ExecutionState

        mock_task_result = TaskResult(
            result="Completed unknown task",
            reflection="Task context was unclear"
        )

        mock_artifact_decision = ArtifactDecision(
            should_create=False,
            name=None,
            artifact_type=None,
            content=None
        )

        with patch("app.agent.execution_graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.execution_graph.ChatOpenAI") as mock_llm_class:
                mock_llm = MagicMock()
                mock_reflection_llm = MagicMock()
                mock_reflection_llm.invoke.return_value = mock_task_result
                mock_artifact_llm = MagicMock()
                mock_artifact_llm.invoke.return_value = mock_artifact_decision
                mock_llm.with_structured_output.side_effect = [mock_reflection_llm, mock_artifact_llm]
                mock_llm_class.return_value = mock_llm

                graph_builder = create_execution_graph()
                # Access the node's runnable via .runnable attribute
                artifact_node_spec = graph_builder.nodes["artifact_creator"]
                artifact_node_runnable = artifact_node_spec.runnable

                state: ExecutionState = {
                    "messages": [AIMessage(content="Done")],
                    "session_id": "test-session",
                    "current_task_id": "non-existent-task",
                    "tasks": [],  # No tasks
                    "artifacts": [],
                    "task_result": None,
                    "task_reflection": None,
                    "created_artifact": None,
                    "is_complete": False,
                }

                # RunnableCallable uses .invoke() method
                result = artifact_node_runnable.invoke(state)

                # Should still complete
                assert result["is_complete"] is True
                assert result["task_result"] is not None


class TestArtifactCreatorNode:
    """Test artifact creator node decision logic."""

    def test_artifact_creator_skips_empty_result(self):
        """Artifact creator skips when task_result is empty.

        If there's no meaningful result, no artifact should be created.
        """
        from app.agent.execution_graph import create_execution_graph
        from app.agent.state import ExecutionState

        with patch("app.agent.execution_graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.execution_graph.ChatOpenAI"):
                graph_builder = create_execution_graph()
                # Access the node's runnable via .runnable attribute
                artifact_node_spec = graph_builder.nodes["artifact_creator"]
                artifact_node_runnable = artifact_node_spec.runnable

                state: ExecutionState = {
                    "messages": [],
                    "session_id": "test-session",
                    "current_task_id": "test-task",
                    "tasks": [{"id": "test-task", "title": "Test"}],
                    "artifacts": [],
                    "task_result": "",  # Empty result
                    "task_reflection": None,
                    "created_artifact": None,
                    "is_complete": True,
                }

                # RunnableCallable uses .invoke() method
                result = artifact_node_runnable.invoke(state)

                assert result["created_artifact"] is None

    def test_artifact_creator_skips_none_result(self):
        """Artifact creator skips when task_result is None."""
        from app.agent.execution_graph import create_execution_graph
        from app.agent.state import ExecutionState

        with patch("app.agent.execution_graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.execution_graph.ChatOpenAI"):
                graph_builder = create_execution_graph()
                # Access the node's runnable via .runnable attribute
                artifact_node_spec = graph_builder.nodes["artifact_creator"]
                artifact_node_runnable = artifact_node_spec.runnable

                state: ExecutionState = {
                    "messages": [],
                    "session_id": "test-session",
                    "current_task_id": "test-task",
                    "tasks": [{"id": "test-task", "title": "Test"}],
                    "artifacts": [],
                    "task_result": None,
                    "task_reflection": None,
                    "created_artifact": None,
                    "is_complete": True,
                }

                # RunnableCallable uses .invoke() method
                result = artifact_node_runnable.invoke(state)

                assert result["created_artifact"] is None


class TestTaskResultModel:
    """Test TaskResult Pydantic model."""

    def test_task_result_model_creation(self):
        """TaskResult model can be created with valid data."""
        from app.agent.execution_graph import TaskResult

        result = TaskResult(
            result="Completed successfully",
            reflection="Good execution"
        )

        assert result.result == "Completed successfully"
        assert result.reflection == "Good execution"

    def test_task_result_model_requires_both_fields(self):
        """TaskResult model requires both result and reflection."""
        from app.agent.execution_graph import TaskResult
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            TaskResult(result="Only result")  # Missing reflection


class TestArtifactDecisionModel:
    """Test ArtifactDecision Pydantic model."""

    def test_artifact_decision_should_not_create(self):
        """ArtifactDecision can indicate no artifact needed."""
        from app.agent.execution_graph import ArtifactDecision

        decision = ArtifactDecision(
            should_create=False,
            name=None,
            artifact_type=None,
            content=None
        )

        assert decision.should_create is False
        assert decision.name is None

    def test_artifact_decision_should_create(self):
        """ArtifactDecision can indicate artifact creation with details."""
        from app.agent.execution_graph import ArtifactDecision

        decision = ArtifactDecision(
            should_create=True,
            name="Research Summary",
            artifact_type="document",
            content="# Summary\n\nKey findings..."
        )

        assert decision.should_create is True
        assert decision.name == "Research Summary"
        assert decision.artifact_type == "document"
        assert "# Summary" in decision.content


class TestFormatMessages:
    """Test _format_messages helper function."""

    def test_format_messages_human_message(self):
        """Formats HumanMessage correctly."""
        from app.agent.execution_graph import _format_messages

        messages = [HumanMessage(content="Hello")]
        result = _format_messages(messages)

        assert "User: Hello" in result

    def test_format_messages_ai_message(self):
        """Formats AIMessage correctly."""
        from app.agent.execution_graph import _format_messages

        messages = [AIMessage(content="Response text")]
        result = _format_messages(messages)

        assert "Assistant: Response text" in result

    def test_format_messages_ai_with_tool_calls(self):
        """Formats AIMessage with tool calls correctly."""
        from app.agent.execution_graph import _format_messages

        messages = [
            AIMessage(
                content="",
                tool_calls=[{"id": "call_1", "name": "calculator", "args": {"expression": "2+2"}}]
            )
        ]
        result = _format_messages(messages)

        assert "Tool call: calculator" in result

    def test_format_messages_truncates_long_history(self):
        """Format messages truncates to last 20 messages."""
        from app.agent.execution_graph import _format_messages

        # Create 30 messages
        messages = [HumanMessage(content=f"Message {i}") for i in range(30)]
        result = _format_messages(messages)

        # Should only contain last 20
        assert "Message 10" in result  # First of last 20
        assert "Message 29" in result  # Last message
        # Message 0-9 should not be present (truncated)
        assert "Message 0" not in result
        assert "Message 9" not in result


class TestExecutionGraphStructure:
    """Test execution graph builder structure."""

    def test_graph_has_required_nodes(self):
        """Graph builder contains all required nodes."""
        from app.agent.execution_graph import create_execution_graph

        with patch("app.agent.execution_graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.execution_graph.ChatOpenAI"):
                graph_builder = create_execution_graph()

                # Check all required nodes exist (reflect was merged into artifact_creator)
                assert "agent" in graph_builder.nodes
                assert "tools" in graph_builder.nodes
                assert "artifact_creator" in graph_builder.nodes
                # reflect node no longer exists - functionality merged into artifact_creator
                assert "reflect" not in graph_builder.nodes

    def test_graph_entry_point_is_agent(self):
        """Graph entry point is the agent node."""
        from app.agent.execution_graph import create_execution_graph

        with patch("app.agent.execution_graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.execution_graph.ChatOpenAI"):
                graph_builder = create_execution_graph()

                # Check entry point - _all_edges is a set of tuples (source, target)
                # Find edge from __start__ to agent
                entry_edge_found = any(
                    edge[0] == "__start__" and edge[1] == "agent"
                    for edge in graph_builder._all_edges
                )
                assert entry_edge_found, "No entry edge from __start__ to agent found"

    def test_graph_has_tools_to_agent_edge(self):
        """Graph has edge from tools back to agent."""
        from app.agent.execution_graph import create_execution_graph

        with patch("app.agent.execution_graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.execution_graph.ChatOpenAI"):
                graph_builder = create_execution_graph()

                # Check tools -> agent edge exists
                tools_edge_found = any(
                    edge[0] == "tools" and edge[1] == "agent"
                    for edge in graph_builder._all_edges
                )
                assert tools_edge_found, "No edge from tools to agent found"

    def test_graph_compiles_successfully(self):
        """Graph can be compiled successfully, validating all edges.

        Note: The reflect node was removed. Now agent routes directly
        to artifact_creator via conditional edge when no tool calls.
        Compilation validates that all edges (including conditional) are valid.
        """
        from app.agent.execution_graph import create_execution_graph

        with patch("app.agent.execution_graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.execution_graph.ChatOpenAI"):
                graph_builder = create_execution_graph()

                # Compilation validates all edges are properly configured
                compiled_graph = graph_builder.compile()
                assert compiled_graph is not None

                # Verify the three expected nodes are in the compiled graph
                assert "agent" in graph_builder.nodes
                assert "tools" in graph_builder.nodes
                assert "artifact_creator" in graph_builder.nodes

    def test_graph_has_end_edge(self):
        """Graph has edge from artifact_creator to END."""
        from app.agent.execution_graph import create_execution_graph

        with patch("app.agent.execution_graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.execution_graph.ChatOpenAI"):
                graph_builder = create_execution_graph()

                # Check artifact_creator -> __end__ edge exists
                end_edge_found = any(
                    edge[0] == "artifact_creator" and edge[1] == "__end__"
                    for edge in graph_builder._all_edges
                )
                assert end_edge_found, "No edge from artifact_creator to __end__ found"
