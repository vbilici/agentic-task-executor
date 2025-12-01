# Documentation

This is an **Agent-Driven TODO Executor** app - an AI-powered application that helps users achieve goals by breaking them into actionable tasks and executing them autonomously.

## System Overview

```
User Goal → Planning Agent → TODO List → Execution Agent → Results & Artifacts
     ↑                                                           ↓
     └─────────────────── Chat Interface ←───────────────────────┘
```

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React + TypeScript | Real-time UI with SSE streaming |
| **Backend** | FastAPI + LangGraph | API and agent orchestration |
| **Database** | Supabase (PostgreSQL) | Session and artifact persistence |
| **AI** | OpenAI GPT-4o | Powers planning and execution agents |
| **Tools** | Tavily API | Web search, plus built-in calculators and date tools |

## User Journey

1. **Create Session** - Start a new session
2. **Chat About Goal** - Describe what you want to accomplish
3. **Refine Plan** - Agent asks clarifying questions and generates tasks
4. **Execute** - Click execute to run tasks with real-time progress
5. **Review Results** - View completed tasks and saved artifacts

## Documentation Index

| Document | Description |
|----------|-------------|
| [How It Works](how-it-works.md) | Deep dive into the agent architecture, planning/execution flow, real-time streaming, and session states |
| [Technology Decisions](decisions.md) | Reasoning behind key technology choices (Python, FastAPI, LangGraph, React, Supabase, etc.) |
| [Development Workflow](development-workflow.md) | AI-assisted development setup with Claude Code, custom MCP server, and specialized agents |
| [Deployment](deployment.md) | Google Cloud Run architecture with automatic GitHub deployments |
| [Future Ideas](further-development-ideas.md) | Potential enhancements: auth, multi-modal I/O, parallel execution, and more |

## Quick Links

- **Main README**: [../README.md](../README.md) - Installation and setup instructions
- **API Docs**: http://localhost:8000/docs (when running locally)
- **Feature Specs**: [../specs/](../specs/) - Detailed feature specifications
