import { Session } from "../models/index.js";
import { config } from "../config/index.js";
import { getTranscriptionJob } from "./transcription/assemblyai.js";
import { completeSessionFromAssemblyJob } from "./functionHandlers.js";
import { logger } from "../lib/logger.js";

let timer = null;
let running = false;
const POLL_INTERVAL_MS = 8000;
const BATCH = 25;

async function tick() {
  if (running) return;
  if (!config.assemblyAiKey) return;
  running = true;
  try {
    const inflight = await Session.find({
      processing_status: { $in: ["transcribing", "analyzing"] },
      assemblyai_job_id: { $ne: null, $exists: true },
    })
      .limit(BATCH)
      .lean();

    if (!inflight.length) return;

    for (const session of inflight) {
      try {
        const job = await getTranscriptionJob(session.assemblyai_job_id);
        if (job.status === "completed" || job.status === "error") {
          await completeSessionFromAssemblyJob(String(session._id), job);
          logger.info("Session transcription completed (inline poll)", {
            session_id: String(session._id),
            status: job.status,
          });
        }
      } catch (err) {
        logger.error("Inline transcription poll error", {
          session_id: String(session._id),
          error: err.message,
        });
      }
    }
  } catch (err) {
    logger.error("transcriptionPoller tick failed", { error: err.message });
  } finally {
    running = false;
  }
}

export function startTranscriptionPoller() {
  if (timer) return;
  if (!config.assemblyAiKey) {
    logger.info("Transcription poller disabled (no ASSEMBLYAI_API_KEY)");
    return;
  }
  logger.info("Transcription poller started", { interval_ms: POLL_INTERVAL_MS });
  timer = setInterval(() => {
    tick().catch((err) => logger.error("Poller error", { error: err.message }));
  }, POLL_INTERVAL_MS);
}

export function stopTranscriptionPoller() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
