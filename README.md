# App

An **Agent-Driven TODO Executor** - a full-stack application where an AI agent chats with users about goals, generates structured TODO lists, and executes tasks with real-time visibility.

## Overview

```
User Goal → Planning Agent → TODO List → Execution Loop → Results
     ↑                                          ↓
     └──────────── Chat Interface ←─────────────┘
```

For a detailed explanation of how the system works, see [docs/README.md](docs/README.md).

## Agent Architecture

App uses [LangGraph](https://langchain-ai.github.io/langgraph/) to orchestrate two distinct agent workflows. See [How It Works](docs/how-it-works.md) for detailed architecture diagrams and flow explanations.

- **Planning Graph** - Handles chat interactions and task generation from user goals
- **Execution Graph** - Executes individual tasks using tools (web search, calculator, etc.)

### Available Tools

| Tool | Description |
|------|-------------|
| `web_search` | Search the internet via Tavily API* |
| `web_fetch` | Fetch and extract content from URLs via Tavily API* |
| `calculator` | Perform mathematical calculations |
| `get_current_datetime` | Get current date and time |
| `format_date` | Format dates in different styles |
| `calculate_date_difference` | Calculate time between dates |
| `add_time_to_date` | Add/subtract time from a date |
| `read_artifact` | Read previously created artifacts |
| `list_artifacts` | List all session artifacts |

*Requires `TAVILY_API_KEY` to be configured. These tools are automatically disabled when the key is not provided.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.13, FastAPI, LangGraph, LangChain |
| **Frontend** | TypeScript, Vite, React 18, shadcn/ui, Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **LLM** | OpenAI API |
| **Tools** | Tavily API (web search) |
| **Real-time** | SSE (Server-Sent Events) |

## Prerequisites

- **Python** 3.13+
- **Node.js** 18+
- **uv** - Python package manager ([install](https://docs.astral.sh/uv/getting-started/installation/))
- **pnpm** - Node.js package manager ([install](https://pnpm.io/installation))
- **Supabase** account with a project
- **OpenAI** API key
- **Tavily** API key (optional, for web search tools)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd libra
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
uv sync

# Create .env file
cp .env.example .env  # or create manually
```

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...  # Optional: enables web_search and web_fetch tools
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env.local file
cp .env.example .env.local  # or create manually
```

Create a `.env.local` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
```

## Running the Application

### Start the Backend

```bash
cd backend
uv run fastapi dev
```

The backend will be available at http://localhost:8000

### Start the Frontend

```bash
cd frontend
pnpm dev
```

The frontend will be available at http://localhost:5173

## Development

### Backend Commands

```bash
cd backend

# Run development server
uv run fastapi dev

# Run linting (with auto-fix)
uv run ruff check --fix app/
uv run ruff format app/

# Type checking
uv run mypy app/

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=app
```

### Frontend Commands

```bash
cd frontend

# Run development server
pnpm dev

# Linting (with auto-fix)
pnpm lint:fix
pnpm lint

# Type checking
pnpm tsc

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate API types from backend OpenAPI
pnpm gen-types

# Build for production
pnpm build
```

## Key URLs

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Frontend application |
| http://localhost:8000 | Backend API |
| http://localhost:8000/docs | API documentation (Swagger) |
| http://localhost:8000/openapi.json | OpenAPI schema |

## Project Structure

```
libra/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── core/                # Config & database
│   │   ├── api/                 # API endpoints
│   │   ├── agent/               # LangGraph agent
│   │   ├── models/              # Pydantic models
│   │   └── services/            # Business logic
│   ├── migrations/              # SQL migrations
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API client
│   │   └── types/               # TypeScript types
│   ├── package.json
│   └── vite.config.ts
└── specs/                       # Feature specifications
```

## Documentation

See [docs/README.md](docs/README.md) for the full documentation index.

| Document | Description |
|----------|-------------|
| [How It Works](docs/how-it-works.md) | Detailed explanation of the agent architecture, planning/execution flow, and real-time streaming |
| [Technology Decisions](docs/decisions.md) | Reasoning behind key technology choices (Python, FastAPI, LangGraph, React, etc.) |
| [Development Workflow](docs/development-workflow.md) | AI-assisted development setup: Claude Code, custom MCP server, and specialized agents |
| [Deployment](docs/deployment.md) | Google Cloud Run architecture with automatic GitHub deployments |
| [Future Ideas](docs/further-development-ideas.md) | Potential enhancements: auth, multi-modal I/O, parallel execution, and more |
