# Phase 2 — Usage limits (SaaS readiness)

Planned follow-up after Option A (honest UI). Goal: make admin **Usage & Limits** settings enforce behavior, not just save to MongoDB.

## Problem today

- `AISettings.org_usage_limits` saves from admin UI but **backend ignores it**
- Minutes are **tracked** (sessions + `/Usage`) but **not capped**
- Upload size limit in admin UI does not affect multer routes

## Scope — Light B (recommended first)

### 1. Backend: read org defaults

Add `getOrgUsageLimits()` in `backend/src/services/usageLimits.js`:

- Load `AISettings` singleton (`setting_key: "global"`)
- Return `org_usage_limits` with defaults, e.g.:
  - `monthly_minutes: 600` (or `null` = unlimited)
  - `max_file_upload_mb: 500`

### 2. Enforce `max_file_upload_mb`

In `backend/src/routes/index.js` and `files.js` upload handlers:

- Before `storeAudioBuffer` / asset upload, compare `req.file.size` to limit from `getOrgUsageLimits()`
- Return `413` with clear message if over limit

### 3. Enforce `monthly_minutes` (soft → hard)

Use existing `getMinutesUsedForEmail()` from `usageMinutes.js`:

- **Soft:** include `minutes_cap` and `minutes_used` in `/auth/me` or subscription API; show progress on `/Usage`
- **Hard:** before starting recording or `InvokeLLM`, check cap; return `429` or block with user-facing message

Suggested first behavior: **warn in UI + block new recordings** when over cap; allow viewing existing sessions.

### 4. Re-enable admin UI

In `AdminSettings.jsx`:

- Uncomment **Usage & Limits** tab
- Show only: `monthly_minutes`, `max_file_upload_mb`, `max_folders` (optional)
- Keep legacy LLM dropdowns commented until Phase 3
- Wire Save → `AISettings.org_usage_limits` (already works)

### 5. Frontend `/Usage`

In `planConfig.js` / `Usage.jsx`:

- Fetch org cap from new API field (e.g. `GET /app/public-settings` or `/auth/me` subscription payload)
- Drive `getDisplayCap()` from `org_usage_limits.monthly_minutes`

## Phase 3 — Full B (later)

- Feature toggles: `ai_analysis_enabled`, `export_enabled`, `workspace_enabled`
- Per-user caps from org admin (`/admin/org/users`)
- Optional: wire `FeatureAISection` to backend (or keep env-only Groq/AssemblyAI)

## Files to touch (Light B)

| File | Change |
|------|--------|
| `backend/src/services/usageLimits.js` | **New** — load + cache org limits |
| `backend/src/routes/index.js` | Upload size check; optional LLM gate |
| `backend/src/routes/admin.js` | Expose limits in usage summary |
| `backend/src/services/usageMinutes.js` | Compare used vs cap helper |
| `src/pages/AdminSettings.jsx` | Re-enable Usage tab (subset of ProPlanSettings) |
| `src/utils/planConfig.js` | Read cap from API |
| `src/pages/Usage.jsx` | Show enforced cap bar |

## Definition of done (Light B)

- [ ] Admin sets 600 monthly minutes → `/Usage` shows cap and usage %
- [ ] User over cap cannot start new recording (or sees clear block)
- [ ] Upload over `max_file_upload_mb` rejected by API
- [ ] Limits survive Render redeploy (MongoDB `AISettings`)
- [ ] No misleading LLM provider dropdowns re-enabled without backend wiring

## Estimate

Light B: ~1–2 days focused work. Full B: additional week+.
