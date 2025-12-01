# Technology Decision Log

This document captures the reasoning behind key technology choices for this hometask.

## Backend

### Python

I chose Python becaue it has the most mature ecosystem for AI/ML with first-class support from LangChain, LangGraph, and all major LLM providers and I already have experience with it.

### FastAPI
Fastapi is like express.js for node, becme the de-facto chioce for any async first design. And it is well integrated with Pydantic.

### Langchain - LangGraph
- Langchain togeteher with Langgraph is very strong combination. It is very easy to create multi-step agent confitional routing workflows with human in the loop thanks to langraph's graph strucuture.
- It also comes with persistance layer that saves the chat state as checkpoints. I used the Langchain-postgres-checkpointer official module to enable the persistance 
- Comes with streaming support out of the box
- Easy to swap between OpenAI, Anthropic, or other providers


### UV Package manager
10-100x faster than pip for dependency resolution and installation
using pyproject.toml is a way better dev experience than requirements.txt

## Frontend

### TypeScript

- design time and compile time error catching
- better dev experience with autocomplete and refactoring
- I generate the api return types from backend OpenAPI schema with `openapi-typescript`

### React 18
React 19 is relatively new. And I suspect that the LLM has not trained with enough data to excel with the new features coming with 19.

### Vite
Very good dev experince with super fast HMR and buiilt times

### Why not next.js or any other PWA framework
- There is no need for SSR for this project
- I wanted to focus on the agentic business logic rather then dealing with complexiity coming with any PWA framework

### Tailwind CSS - ShadCN

- Allows to develop fast and beautiful UI
- Not opinianeted
- I have the full control over component styling and behavior. No dependency on external package updates when a customaztion is needed


### pnpm
- Faster than npm in general
- Better workspace management with symlinks

### OXC Linter and Formatter
- New generation linter
- Written with Rust
- 50-100x faster than Eslint
- Covers more than 95% of Eslint rules

## Database

### Supabase (PostgreSQL)
- It has a very generous free tier
- Postggres is the de-facto choice for any new app these days unless there is a very specific requirement
- Supabase gives me a quick start with a lot of functionalty such as auth from the start
- for a greenfield project I don't have to think about hosting, backups, scaling

## Real-time Communication

### Server-Sent Events (SSE) for the chat part

- websocket is usually an overkill unless you need something very specific
- One way streaming is usually sufficient
- Works through proxies and firewalls

### Tavily
- Generous free tier
- Good enough for this project, allows me add search and fetch tools out of the box


