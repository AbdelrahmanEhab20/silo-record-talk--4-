# Silo App (Owned Stack)

Frontend is hosted on Vercel and connects to the owned Node/Express backend hosted on Render.

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
