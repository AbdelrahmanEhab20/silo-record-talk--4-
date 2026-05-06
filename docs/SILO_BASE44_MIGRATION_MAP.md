# Silo Base44 Migration Map

This document maps existing Base44 usage to the owned backend API and worker jobs.

## Frontend SDK usage -> Backend API

- `base44.auth.me()` -> `GET /api/auth/me`
- `base44.auth.isAuthenticated()` -> `GET /api/auth/session`
- `base44.auth.logout()` -> `POST /api/auth/logout`
- `base44.auth.redirectToLogin()` -> client route redirect to `/login`
- `base44.entities.<Entity>.create(payload)` -> `POST /api/entities/:entity`
- `base44.entities.<Entity>.update(id, payload)` -> `PATCH /api/entities/:entity/:id`
- `base44.entities.<Entity>.get(id)` -> `GET /api/entities/:entity/:id`
- `base44.entities.<Entity>.delete(id)` -> `DELETE /api/entities/:entity/:id`
- `base44.entities.<Entity>.filter(query)` -> `GET /api/entities/:entity?filter=...`
- `base44.functions.invoke(name, payload)` -> `POST /api/functions/:name/invoke`
- `base44.integrations.Core.UploadFile()` -> `POST /api/integrations/core/upload-file`
- `base44.integrations.Core.InvokeLLM()` -> `POST /api/integrations/core/invoke-llm`

## Base44 function migration -> Worker handlers

- `transcribeAudio` -> `functionHandlers.transcribeAudio()`
- `processSessionBackground` -> `functionHandlers.processSessionBackground()`
- `transcribeChunk` -> `functionHandlers.transcribeChunk()`
- `transcribeChunkAssembly` -> `functionHandlers.transcribeChunkAssembly()`
- `assemblyAIWebhook` -> `functionHandlers.assemblyAIWebhook()`
- `stripeWebhook` -> `functionHandlers.stripeWebhook()`
- `deductMinutes` -> `functionHandlers.deductMinutes()`
- `deductCredits` -> `functionHandlers.deductCredits()`
- `getUserCredits` -> `functionHandlers.getUserCredits()`
- `processVideoUrl` -> `functionHandlers.processVideoUrl()`

## Priority cutover order

1. Auth + session endpoints
2. Session CRUD + upload
3. Background processing queue
4. Billing and webhooks
5. Remaining helper functions
