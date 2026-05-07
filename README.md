# Silo App (Owned Stack)

Frontend is hosted on Vercel and connects to the owned Node/Express backend hosted on Render.

## Monorepo deployment contract

- Frontend code lives at repo root and deploys to Vercel.
- Backend API/worker code lives in `backend/` and deploys to Render.
- Frontend must always call Render API via `VITE_API_BASE_URL`; production no longer falls back to same-origin `/api`.

## Local setup

1. Install frontend dependencies:
   - `npm install`
2. Install backend dependencies:
   - `cd backend && npm install`
3. Create environment files:
   - Frontend: `.env.local` with `VITE_API_BASE_URL=http://localhost:5000/api`
   - Backend: copy `backend/.env.example` to `backend/.env` and set keys/secrets
4. Run backend:
   - `cd backend && npm run dev`
5. Run frontend:
   - `npm run dev`

## Build

- Frontend: `npm run build`
- Backend worker: `cd backend && npm run worker`

## Deployment

- Render services are defined in `render.yaml`
- Vercel SPA rewrites are defined in `vercel.json`
- Cutover and migration steps are in `docs/CUTOVER_RUNBOOK.md`

### Vercel (frontend)

- Root directory: repo root
- Build command: `npm run build`
- Output directory: `dist`
- Required env: `VITE_API_BASE_URL=https://<render-api-domain>/api`
- Important: any `VITE_*` env update requires a new Vercel deploy.

### Render (backend)

- API service root: `backend`, start: `npm start`
- Worker service root: `backend`, start: `npm run worker`
- Required envs for API: `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, `NODE_ENV`
- `CORS_ORIGINS` must include `FRONTEND_URL` in production.
