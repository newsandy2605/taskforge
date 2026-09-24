# TaskForge

TaskForge is a full-stack project management platform built as a portfolio project to demonstrate practical backend, frontend, database, cloud, and DevOps skills.

## What it demonstrates

- JWT authentication with Argon2 password hashing
- React + Vite frontend
- FastAPI REST backend
- PostgreSQL relational data model
- Redis caching and pub/sub
- WebSocket project updates
- Kanban board with drag-and-drop status changes
- Search, priority filtering, and assignee filtering
- Team members with owner/admin/member/viewer roles
- Comments and project activity/audit logs
- Background jobs through a Redis queue and worker process
- Alembic database migrations
- Docker Compose development environment
- Automated GitHub Actions CI
- Swagger/OpenAPI documentation

## Run locally

### 1. Start the stack

```bash
docker compose up --build
```

### 2. Open the app

- Frontend: http://localhost:5173
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

The first account can create projects. Create a second account in another browser/incognito window, then add that email from the Members panel to test collaboration, roles, comments, and live updates.

## Architecture

```text
React / Vite
     |
     v
 FastAPI REST API -------- WebSocket
     |
  PostgreSQL <---------- Redis
                           |
                           v
                     Background Worker
```

## Project structure

```text
taskforge/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   └── services/
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── worker.py
├── frontend/
│   ├── src/
│   │   └── components/
│   ├── package.json
│   └── vite.config.js
├── .github/workflows/ci.yml
├── docker-compose.yml
└── README.md
```

## Notes

The container starts the API after applying Alembic migrations. The application still has `create_all()` as a small development fallback when the API is imported directly outside Docker.

For a production deployment, replace default secrets, use HTTPS, restrict CORS to the deployed frontend, add refresh-token rotation, use managed PostgreSQL/Redis, and add centralized logging and monitoring.
