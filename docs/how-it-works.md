# How App Works

This demo app is an **Agent-Driven TODO Executor** - an AI-powered application that helps users achieve their goals by breaking them down into actionable tasks and executing them autonomously.

## The Big Picture

```
User Goal → Planning Agent → TODO List → Execution Agent → Results & Artifacts
     ↑                                                           ↓
     └─────────────────── Chat Interface ←───────────────────────┘
```

**The flow is simple:**

1. You describe what you want to accomplish
2. The Planning Agent chats with you to understand your goal
3. It generates a structured TODO list
4. You review and click "Execute"
5. The Execution Agent works through each task using tools (web search, calculations, etc.)
6. Results appear in real-time, and artifacts are saved for future reference

---

## Architecture Overview

The app uses a modern full-stack architecture:

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React + TypeScript | User interface with real-time updates |
| **Backend** | FastAPI + LangGraph | API and agent orchestration |
| **Database** | Supabase (PostgreSQL) | Session and artifact persistence |
| **AI** | OpenAI GPT-4o | Powers both planning and execution agents |
| **Tools** | Tavily API, Custom Tools | Web search, calculations, date handling |

**Real-Time Communication:** The frontend and backend communicate via **Server-Sent Events (SSE)**, which allows the UI to show live updates as the agents think, use tools, and generate content.

---

## The Planning Agent

The Planning Agent's job is to understand your goal and create actionable tasks. It operates as a state machine with intelligent routing.

```
                    ┌─────────────────┐
                    │      START      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ should_extract  │  Analyze conversation,
                    │                 │  extract tasks if ready
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌─────────────────┐           ┌─────────────────┐
     │ chat_with_tasks │           │    chat_only    │
     │                 │           │                 │
     │ Respond with    │           │ Ask clarifying  │
     │ task summary    │           │ questions       │
     └────────┬────────┘           └────────┬────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │       END       │
                    └─────────────────┘
```

### How It Works

**1. Entry Point: `should_extract`**

When you send a message, the agent first evaluates whether your goal is clear enough to create tasks. It asks:
- Is the request specific enough?
- Do I have enough context?
- Should I ask clarifying questions first?

**2. Conditional Routing**

Based on the evaluation, the agent takes one of two paths:

**Path A: `chat_with_tasks`** (Goal is clear)
- Generates 3-10 actionable tasks
- Each task has a title and optional description
- Tasks are ordered logically with dependencies first
- Responds by acknowledging the plan and asking refinement questions

**Path B: `chat_only`** (Goal needs clarification)
- Continues the conversation naturally
- Asks max 3 clarifying questions at a time
- Guides you toward a more specific goal

### Example Interaction

```
You: "I want to plan a trip to Tokyo"

Agent: (evaluates → needs more info → chat_only)
"That sounds exciting! To help you plan effectively, I have a few questions:
- When are you thinking of traveling?
- How long will your trip be?
- What's your budget range?"

You: "Next month, 7 days, around $3000"

Agent: (evaluates → ready → chat_with_tasks)
[Creates tasks: Research flights, Find accommodations, Plan itinerary, etc.]
"I've created a travel planning checklist for your 7-day Tokyo trip!
The tasks cover flights, hotels, and daily activities.
- Do you have any specific neighborhoods you'd like to stay in?
- Any must-visit places on your list?"
```

---

## The Execution Agent

Once you click "Execute", the Execution Agent takes over. It works through each task sequentially, using tools to gather information and complete objectives.

```
                    ┌─────────────────┐
                    │      START      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
              ┌────▶│      agent      │◀────┐
              │     │                 │     │
              │     │ Decide action:  │     │
              │     │ use tool or     │     │
              │     │ finish task     │     │
              │     └────────┬────────┘     │
              │              │              │
              │   ┌──────────┴──────────┐   │
              │   │                     │   │
              │   ▼                     ▼   │
              │ ┌───────┐    ┌─────────────────┐
              │ │ tools │    │artifact_creator │
              │ │       │    │                 │
              │ │ Call  │    │ Summarize task  │
              │ │ tool  │    │ & save artifact │
              │ └───┬───┘    └────────┬────────┘
              │     │                 │
              └─────┘                 ▼
                            ┌─────────────────┐
                            │       END       │
                            └─────────────────┘
```

### How It Works

**1. Entry Point: `agent`**

For each task, the agent:
- Reads the task title and description
- Decides what actions to take
- Can use tools or respond directly

**2. The Agent-Tool Loop**

The agent operates in a loop:
- **Think:** Analyze what's needed
- **Act:** Call a tool if information is required
- **Observe:** Process tool results
- **Repeat:** Continue until the task is complete

**3. Available Tools**

| Tool | Purpose |
|------|---------|
| `web_search` | Search the internet for current information |
| `web_fetch` | Fetch and read specific web pages |
| `calculator` | Perform mathematical calculations |
| `get_current_datetime` | Get the current date and time |
| `format_date` | Format dates in different styles |
| `calculate_date_difference` | Find days between two dates |
| `add_time_to_date` | Add/subtract time from a date |
| `create_artifact` | Save structured content for later |
| `read_artifact` | Access previously saved artifacts |

**4. Exit Point: `artifact_creator`**

After completing the task work, the agent:
- Summarizes what was accomplished
- Decides if the results should be saved as an artifact
- Creates artifacts for research findings, plans, recommendations, etc.

### Example Execution

```
Task: "Research flights from NYC to Tokyo for next month"

Agent: (uses get_current_datetime)
→ "Current date: December 1, 2024"

Agent: (uses web_search)
→ Search: "NYC to Tokyo flights January 2025 prices"
→ Results: [Flight options from various airlines...]

Agent: (uses web_search)
→ Search: "best time to book NYC Tokyo flights"
→ Results: [Booking tips and price trends...]

Agent: (artifact_creator)
→ Creates artifact: "NYC-Tokyo Flight Research"
→ Content: Summarized flight options, prices, and recommendations

Task Complete: "Found 12 flight options ranging from $800-$1400.
Best deals are on JAL and ANA with 1 stop. Direct flights
available on United for $1200. Saved detailed comparison to artifacts."
```

---

## Real-Time Streaming

The app is designed to feel responsive. You never see a frozen screen - there's always visible activity.

### During Planning (Chat)

As you chat with the Planning Agent, you see:
- **Typing indicator** while the agent thinks
- **"Generating tasks..."** when task extraction begins
- **Tasks appear** in the sidebar as they're created
- **Response streams** word-by-word

### During Execution

As each task runs, you see:
- **Task selection** - which task is being worked on
- **Tool calls** - what tool is being used and why
- **Tool results** - what information came back
- **Progress updates** - as the agent works
- **Artifact creation** - when results are saved
- **Task completion** - with result summary

This real-time visibility serves two purposes:
1. **Trust:** You can see exactly what the AI is doing
2. **Feedback:** You know the system is working, not stuck

### Debug Mode

For developers or curious users, the app includes a **debug mode** that shows detailed execution logs. When enabled, you can see:
- Raw tool call parameters
- Full tool responses
- Agent reasoning steps
- Timing information

Toggle debug mode in the settings to get a deeper look at how the agent works through each task.

---

## Pause & Resume

Execution can be **paused and resumed** if you accidentally navigate away or refresh the page during task execution.

### How It Works

When you disconnect during execution (refresh, close tab, navigate away):

1. **Automatic Pause**: The system detects the disconnect and pauses execution
2. **State Preserved**: The current task's progress is saved via LangGraph checkpointing
3. **Status Updates**: Session moves to PAUSED status, task stays "in progress"

When you return:

1. **Visual Indicator**: The paused task shows a pause icon instead of a spinner
2. **Continue Button**: The Execute button changes to "Continue (X tasks remaining)"
3. **Resume Execution**: Click Continue to pick up exactly where you left off

```
[Executing] → [Page Refresh] → [Disconnect Detected]
                                        ↓
                               [Session → PAUSED]
                               [Task stays in_progress]
                                        ↓
[Return to Page] → [See paused state] → [Click Continue]
                                        ↓
                               [Resume from checkpoint]
                               [Session → EXECUTING]
```

### What Gets Preserved

| Data | Preserved? | Notes |
|------|------------|-------|
| Completed tasks | Yes | Results and artifacts saved |
| In-progress task | Yes | Resumes from LangGraph checkpoint |
| Pending tasks | Yes | Will execute after in-progress completes |
| Execution logs | Yes | Full history visible on reload |
| Artifacts | Yes | All created artifacts retained |

This feature ensures you never lose progress, even if you accidentally close your browser mid-execution.

---

## State Persistence

Every conversation and execution is automatically saved to the database using LangGraph's PostgreSQL checkpointer.

### What This Means?

- **Sessions are resumable:** Close the browser and come back later - your conversation continues where you left off
- **Execution is recoverable:** If you disconnect during execution, the session pauses and can be resumed with the Continue button (see [Pause & Resume](#pause--resume))
- **History preserved:** All messages, tasks, and artifacts are stored permanently
- **Sessions lock after execution:** Once all tasks are executed, the session moves to COMPLETED status and becomes read-only. This keeps the system simple and prevents accidental modifications to finished work. To work on a new goal, simply create a new session.

### Session States

| Status | Description |
|--------|-------------|
| **PLANNING** | Initial state - chatting with agent, refining tasks |
| **EXECUTING** | Tasks are being processed by the execution agent |
| **PAUSED** | Execution interrupted (user disconnected), can be resumed |
| **COMPLETED** | All tasks finished, session is read-only |

### How State is Managed

Each session has a unique identifier that tracks:
- Conversation history (all messages between you and the agent)
- Generated tasks and their status (pending, in progress, done, failed)
- Created artifacts (documents, summaries, plans)
- Execution logs (tool calls and results)

---

## Putting It All Together

Here's the complete journey from goal to results:

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CREATE SESSION                                              │
│     └─→ New session created with PLANNING status                │
│                                                                 │
│  2. CHAT ABOUT GOAL                                             │
│     └─→ Planning Agent evaluates and extracts tasks             │
│     └─→ Tasks appear in sidebar                                 │
│     └─→ Agent asks clarifying questions                         │
│                                                                 │
│  3. REFINE PLAN                                                 │
│     └─→ Continue chatting to adjust tasks                       │
│     └─→ Tasks update based on new information                   │
│                                                                 │
│  4. EXECUTE                                                     │
│     └─→ Session moves to EXECUTING status                       │
│     └─→ Execution Agent processes tasks one by one              │
│     └─→ Tools are called, results streamed in real-time         │
│     └─→ Artifacts created for valuable findings                 │
│                                                                 │
│  4a. PAUSE (if user disconnects)                                │
│      └─→ Session moves to PAUSED status                         │
│      └─→ In-progress task state preserved                       │
│      └─→ User returns → sees pause icon + Continue button       │
│      └─→ Click Continue → resumes from step 4                   │
│                                                                 │
│  5. REVIEW RESULTS                                              │
│     └─→ Session moves to COMPLETED status                       │
│     └─→ Summary generated and displayed                         │
│     └─→ Artifacts available for reference                       │
│     └─→ Session is locked (read-only)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

