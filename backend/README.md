# Silo Backend

Owned backend for Silo, replacing Base44 runtime dependencies.

## Local run

1. `cp .env.example .env`
2. `npm install`
3. `npm run dev`

Worker:

- `npm run worker`

## Required environment variables

- `MONGO_URI` MongoDB connection string
- `JWT_SECRET` auth signing secret
- `FRONTEND_URL` canonical frontend URL
- `CORS_ORIGINS` comma-separated allowed origins
- `NODE_ENV=production` on Render

Production guardrails:

- Startup fails if any required env is missing.
- Startup fails if `CORS_ORIGINS` does not include `FRONTEND_URL`.
- `POST /api/auth/dev-login` is disabled in production.

## Optional provider keys

- `OPENAI_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Core endpoints

- `GET /api/health`
- `POST /api/auth/dev-login`
- `GET /api/auth/me`
- `GET /api/entities/:entity`
- `POST /api/entities/:entity`
- `POST /api/functions/:name/invoke`
- `POST /api/integrations/core/upload-file`
