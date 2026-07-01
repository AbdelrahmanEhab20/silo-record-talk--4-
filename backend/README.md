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

## R2 asset storage (avatars + branding)

Set on Render backend for persistent profile photos, logos, and favicons. Session audio stays in MongoDB GridFS.

```bash
STORAGE_PROVIDER=r2
S3_BUCKET=silo-record-talk-assets
S3_REGION=auto
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=https://pub-xxxxxxxx.r2.dev
ASSET_UPLOAD_MAX_SIZE=5242880
```

Uploads with `asset_folder` (`avatars`, `branding/logo`, `branding/favicon`) go to R2 when configured. Other uploads use GridFS unchanged. Omit R2 vars locally to keep GridFS fallback for assets.

## Core endpoints

- `GET /api/health`
- `POST /api/auth/dev-login`
- `GET /api/auth/me`
- `GET /api/entities/:entity`
- `POST /api/entities/:entity`
- `POST /api/functions/:name/invoke`
- `POST /api/integrations/core/upload-file`
