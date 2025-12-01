"""Tests for planning graph nodes (T024-T029)."""

from unittest.mock import AsyncMock, MagicMock, patch

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage


class TestChatNode:
    """Test chat node behavior.

    Note: The old 'chat' node has been replaced with 'chat_only' (for no tasks)
    and 'chat_with_tasks' (for responses with tasks). These tests now verify
    the 'chat_only' node behavior.
    """

    async def test_chat_only_node_returns_ai_message(self):
        """Chat only node returns AIMessage response (T025)."""
        from app.agent.graph import CHAT_PROMPT

        mock_response = AIMessage(content="I'll help you plan that.")

        with patch("app.agent.graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.graph.ChatOpenAI") as mock_llm_class:
                # Create mock LLM instance
                mock_llm = MagicMock()
                mock_llm.ainvoke = AsyncMock(return_value=mock_response)
                mock_llm_class.return_value = mock_llm

                # Import after patching
                from app.agent.graph import create_planning_graph
                from app.agent.state import PlanningState

                # Create graph and get chat_only node function
                graph_builder = create_planning_graph()
                # Access the actual function via .runnable attribute
                chat_node = graph_builder.nodes["chat_only"].runnable

                state: PlanningState = {
                    "messages": [HumanMessage(content="Help me plan a trip")],
                    "session_id": "test-session",
                    "tasks": [],
                    "is_complete": False,
                }

                result = await chat_node.ainvoke(state)

                # Verify result structure
                assert "messages" in result
                assert len(result["messages"]) == 1
                assert isinstance(result["messages"][0], AIMessage)
                assert result["messages"][0].content == "I'll help you plan that."

                # Verify LLM was called with system prompt
                mock_llm.ainvoke.assert_called_once()
                call_args = mock_llm.ainvoke.call_args[0][0]
                # First message should be system message with CHAT_PROMPT
                assert isinstance(call_args[0], SystemMessage)
                assert CHAT_PROMPT in call_args[0].content

    async def test_chat_only_node_uses_execution_summary_prompt(self):
        """Chat only node uses summary prompt when [EXECUTION COMPLETE] in message (T026)."""
        from app.agent.graph import EXECUTION_SUMMARY_PROMPT

        mock_response = AIMessage(content="Here's a summary of what was done.")

        with patch("app.agent.graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.graph.ChatOpenAI") as mock_llm_class:
                mock_llm = MagicMock()
                mock_llm.ainvoke = AsyncMock(return_value=mock_response)
                mock_llm_class.return_value = mock_llm

                from app.agent.graph import create_planning_graph
                from app.agent.state import PlanningState

                graph_builder = create_planning_graph()
                chat_node = graph_builder.nodes["chat_only"].runnable

                state: PlanningState = {
                    "messages": [
                        HumanMessage(content="[EXECUTION COMPLETE] All tasks done.")
                    ],
                    "session_id": "test-session",
                    "tasks": [],
                    "is_complete": False,
                }

                await chat_node.ainvoke(state)

                # Verify execution summary prompt was used
                call_args = mock_llm.ainvoke.call_args[0][0]
                system_msg = call_args[0]
                assert isinstance(system_msg, SystemMessage)
                assert EXECUTION_SUMMARY_PROMPT in system_msg.content


class TestTaskExtractionNode:
    """Test task extraction node behavior.

    Note: The old 'extract_tasks' node has been replaced with 'should_extract'
    which runs first to evaluate whether tasks should be extracted. These tests
    now verify the 'should_extract' node behavior.
    """

    async def test_should_extract_returns_tasks_when_ready(self):
        """Should extract returns task list when ready_to_create_tasks is True (T028)."""
        from app.agent.graph import TaskItem, TaskList

        mock_task_list = TaskList(
            tasks=[
                TaskItem(title="Research options", description="Find choices"),
                TaskItem(title="Compare prices", description=None),
            ],
            ready_to_create_tasks=True,
        )

        with patch("app.agent.graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.graph.ChatOpenAI") as mock_llm_class:
                # Mock both chat LLM and task LLM
                mock_chat_llm = MagicMock()
                mock_task_llm = MagicMock()
                mock_task_llm.ainvoke = AsyncMock(return_value=mock_task_list)
                mock_chat_llm.with_structured_output.return_value = mock_task_llm

                # The graph creates two ChatOpenAI instances
                mock_llm_class.return_value = mock_chat_llm

                from app.agent.graph import create_planning_graph
                from app.agent.state import PlanningState

                graph_builder = create_planning_graph()
                extract_node = graph_builder.nodes["should_extract"].runnable

                state: PlanningState = {
                    "messages": [HumanMessage(content="Plan a vacation")],
                    "session_id": "test-session",
                    "tasks": [],
                    "is_complete": False,
                }

                result = await extract_node.ainvoke(state)

                # Verify tasks were extracted
                assert "tasks" in result
                assert len(result["tasks"]) == 2
                assert result["tasks"][0]["title"] == "Research options"
                assert result["tasks"][0]["description"] == "Find choices"
                assert result["tasks"][1]["title"] == "Compare prices"
                assert result["tasks"][1]["description"] is None
                # Note: should_extract sets ready_to_create_tasks, not is_complete
                assert result.get("ready_to_create_tasks", True) is True

    async def test_should_extract_returns_empty_when_not_ready(self):
        """Should extract returns empty list when goal is unclear (T029)."""
        from app.agent.graph import TaskList

        mock_task_list = TaskList(
            tasks=[],
            ready_to_create_tasks=False,
        )

        with patch("app.agent.graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.graph.ChatOpenAI") as mock_llm_class:
                mock_chat_llm = MagicMock()
                mock_task_llm = MagicMock()
                mock_task_llm.ainvoke = AsyncMock(return_value=mock_task_list)
                mock_chat_llm.with_structured_output.return_value = mock_task_llm
                mock_llm_class.return_value = mock_chat_llm

                from app.agent.graph import create_planning_graph
                from app.agent.state import PlanningState

                graph_builder = create_planning_graph()
                extract_node = graph_builder.nodes["should_extract"].runnable

                state: PlanningState = {
                    "messages": [HumanMessage(content="I need help")],
                    "session_id": "test-session",
                    "tasks": [],
                    "is_complete": False,
                }

                result = await extract_node.ainvoke(state)

                assert result["tasks"] == []
                assert result.get("ready_to_create_tasks", False) is False


class TestPlanningGraphStructure:
    """Test planning graph structure and routing.

    Note: The graph structure has changed:
    - Old: chat, extract_tasks
    - New: should_extract, chat_with_tasks, chat_only
    """

    def test_graph_has_correct_nodes(self):
        """Planning graph has should_extract, chat_with_tasks, and chat_only nodes."""
        with patch("app.agent.graph.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(openai_api_key="test-key")

            with patch("app.agent.graph.ChatOpenAI"):
                from app.agent.graph import create_planning_graph

                graph_builder = create_planning_graph()

                # New node structure
                assert "should_extract" in graph_builder.nodes
                assert "chat_with_tasks" in graph_builder.nodes
                assert "chat_only" in graph_builder.nodes
                # Old nodes should not exist
                assert "chat" not in graph_builder.nodes
                assert "extract_tasks" not in graph_builder.nodes
