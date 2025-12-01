# Technology Decision Log

This document captures the reasoning behind key technology choices for this hometask.

## Backend

### Python

I chose Python because it has the most mature ecosystem for AI/ML with first-class support from LangChain, LangGraph, and all major LLM providers and I already have experience with it.

### FastAPI
- FastAPI has become the de-facto choice for any async-first API app. 
- It is well integrated with Pydantic.

### pytest
- De-facto standard for Python testing
- Simple syntax
- Rich plugin ecosystem (pytest-asyncio, pytest-mock, pytest-httpx)

### LangChain - LangGraph
- LangChain together with LangGraph is a very strong combination. It is very easy to create multi-step agent conditional routing workflows with human in the loop thanks to LangGraph's graph structure.
- It also comes with a persistence layer that saves the chat state as checkpoints. I used the LangChain-postgres-checkpointer official module to enable persistence 
- Comes with streaming support out of the box
- Easy to swap between OpenAI, Anthropic, or other providers


### UV Package manager
- 10-100x faster than pip for dependency resolution and installation
- using pyproject.toml is a way better dev experience than requirements.txt

## Frontend

### TypeScript

- design time and compile time error catching
- better dev experience with autocomplete and refactoring
- I generate the API return types from backend OpenAPI schema with `openapi-typescript`

### React 18
React 19 is relatively new. And I suspect that the LLM has not trained with enough data to excel with the new features coming with 19.

### Vite
Very good dev experience with super fast HMR and build times

### Vitest
Faster than Jest with the same API

### Why not next.js or any other PWA framework
- There is no need for SSR for this project
- I wanted to focus on the agentic business logic rather than dealing with complexity coming with any PWA framework

### Tailwind CSS - ShadCN

- Allows to develop fast and beautiful UI
- Not opinionated
- I have full control over component styling and behavior. No dependency on external package updates when a customization is needed


### pnpm
- Faster than npm in general
- Better workspace management with symlinks

### OXC Linter and Formatter
- New generation linter
- Written with Rust
- 50-100x faster than ESLint
- Covers more than 95% of ESLint rules

## Database

### Supabase (PostgreSQL)
- It has a very generous free tier
- Postgres is the de-facto choice for any new app these days unless there is a very specific requirement
- Supabase gives me a quick start with a lot of functionality such as auth from the start
- for a greenfield project I don't have to think about hosting, backups, scaling

## Real-time Communication

### Server-Sent Events (SSE) for the chat part

- WebSocket is usually overkill unless you need something very specific
- One-way streaming is usually sufficient
- Works through proxies and firewalls

### Tavily
- Generous free tier
- Good enough for this project, allows me to add search and fetch tools out of the box


