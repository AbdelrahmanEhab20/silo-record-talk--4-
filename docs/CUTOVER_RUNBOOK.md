# Silo Cutover Runbook

## 1) Deploy backend on Render

- Create `silo-api` and `silo-worker` from `render.yaml`.
- Set required env vars:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `FRONTEND_URL`
  - `CORS_ORIGINS`
  - Optional provider keys (`OPENAI_API_KEY`, `ASSEMBLYAI_API_KEY`, `STRIPE_SECRET_KEY`).
- Ensure `CORS_ORIGINS` contains `FRONTEND_URL` exactly (production startup now validates this).

## 2) Deploy frontend on Vercel

- Import this repo.
- Set build command: `npm run build`
- Set output dir: `dist`
- Add env var: `VITE_API_BASE_URL=https://<render-api-domain>/api`
- Keep SPA rewrites using `vercel.json`.
- Redeploy Vercel whenever `VITE_API_BASE_URL` changes (Vite env is build-time).

## 3) Data migration

- Export Base44 collections to JSON files (`User.json`, `Session.json`, `Workspace.json`).
- Run:
  - `cd backend`
  - `npm run migrate:base44 -- ./path/to/export`
- Validate record counts in MongoDB.

## 4) Validation checklist

- `GET /api/health` returns `200`.
- Password login works: `POST /api/auth/login`.
- `POST /api/auth/dev-login` is blocked in production.
- Session create/update/list works through frontend.
- `processSessionBackground` can mark sessions `done`.
- Stripe webhook endpoint reachable.

## 5) Cutover

- Deploy/update backend on Render first.
- Update Vercel env var `VITE_API_BASE_URL` to Render API.
- Redeploy frontend after env update.
- Monitor backend logs for 24h.
- Disable Base44 function triggers after stable period.
