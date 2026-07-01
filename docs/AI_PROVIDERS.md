# AI providers (Silo standalone deployment)

How AI works on Render + Vercel for this project.

## Providers in production

| Job | Provider | Render env vars |
|-----|----------|-----------------|
| Live mic recording transcript | Browser Web Speech API | (none — client-side) |
| Uploaded / re-transcribed audio | AssemblyAI | `ASSEMBLYAI_API_KEY` |
| Text AI (summaries, tags, folder reports, word analysis, Ask Silo) | Groq (fallback: Gemini, OpenAI) | `GROQ_API_KEY`, `GROQ_MODEL` |

## Backend entry points

- **Transcription:** `backend/src/services/transcription/assemblyai.js`, `functionHandlers.js`
- **LLM:** `backend/src/services/llm/index.js` → `POST /api/integrations/core/invoke-llm`
- **Post-transcription analysis:** `analyzeTranscript()` after AssemblyAI completes

## Frontend features using Groq

All call `appClient.integrations.Core.InvokeLLM` → backend Groq:

- Session summaries, action items, tags
- Folder reports (`FolderReportModal.jsx`)
- Word / sentiment analysis (`WordAnalysis.jsx` — brain icon on session detail)
- Ask Silo, flashcards, export helpers, etc.

## What admin UI does today (Option A)

- **Platform → AI Providers tab:** read-only banner (env-driven)
- **Platform → Usage & Limits tab:** hidden until Phase 2
- **User Settings → AI cards:** read-only “App Default” card

Legacy dropdowns in `AISettings` MongoDB document are **not read** by the Node backend at runtime.

## Changing providers

Update Render backend environment variables and redeploy. No Vercel secrets required for AssemblyAI/Groq.

See [PHASE2_USAGE_LIMITS.md](./PHASE2_USAGE_LIMITS.md) for planned quota enforcement.
