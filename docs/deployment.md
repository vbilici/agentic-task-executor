# Deployment Architecture

The app runs on Google Cloud Run with automatic deployments from GitHub.

## Overview

```
┌─────────────┐      push       ┌─────────────┐
│   GitHub    │ ───────────────▶│ Cloud Build │
│   (main)    │                 │  Triggers   │
└─────────────┘                 └──────┬──────┘
                                       │
                                       │ build & deploy
                                       ▼
                          ┌────────────────────────┐
                          │    Artifact Registry   │
                          │   (Docker images)      │
                          └───────────┬────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
          ┌─────────────────┐                ┌─────────────────┐
          │   Cloud Run     │                │   Cloud Run     │
          │   (Frontend)    │                │   (Backend)     │
          │                 │                │                 │
          │  - nginx        │   API calls    │  - FastAPI      │
          │  - static files │ ──────────────▶│  - LangGraph    │
          └─────────────────┘                └────────┬────────┘
                                                      │
                                                      │ queries
                                                      ▼
                                             ┌─────────────────┐
                                             │    Supabase     │
                                             │  (PostgreSQL)   │
                                             └─────────────────┘
```

## Infrastructure

### Cloud Run Services

| Service | Region | CPU | Memory | Port |
|---------|--------|-----|--------|------|
| Frontend | europe-west3 | 1 vCPU | 512 MB | 8080 |
| Backend | europe-west3 | 1 vCPU | 1 GB | 8080 |

Both services:
- Scale to zero when idle
- Auto-scale based on request concurrency (max 80 concurrent requests per instance)
- 300 second request timeout

### Automatic Deployment

Cloud Build triggers are connected to the GitHub repository. When code is pushed to `main`:

1. Cloud Build detects the push
2. Builds Docker images for frontend and backend
3. Pushes images to Artifact Registry
4. Deploys new revisions to Cloud Run

No manual deployment steps required.

### Database

Supabase (PostgreSQL) hosted on AWS eu-central-1. The backend connects via connection pooler.

## URLs

| Service | URL |
|---------|-----|
| Frontend | https://agentic-task-executor-frontend-qzcufu26pq-ey.a.run.app |
| Backend | https://agentic-task-executor-backend-qzcufu26pq-ey.a.run.app |

## Environment Variables

### Backend
- `DATABASE_URL` - Supabase connection string
- `SUPABASE_URL` - Supabase API URL
- `SUPABASE_KEY` - Supabase anon key
- `OPENAI_API_KEY` - OpenAI API key
- `TAVILY_API_KEY` - Tavily search API key

### Frontend
- Built-in: `VITE_API_URL` points to backend Cloud Run URL