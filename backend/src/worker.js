import { connectDb } from "./lib/db.js";
import { logger } from "./lib/logger.js";
import { Job, Session } from "./models/index.js";
import { functionHandlers, completeSessionFromAssemblyJob } from "./services/functionHandlers.js";
import { getTranscriptionJob } from "./services/transcription/assemblyai.js";
import { config } from "./config/index.js";

async function processOneJob() {
  const job = await Job.findOneAndUpdate(
    { status: "queued" },
    { status: "running" },
    { new: true, sort: { createdAt: 1 } }
  );
  if (!job) return;
  try {
    const handler = functionHandlers[job.type];
    if (!handler) throw new Error(`Unknown job handler: ${job.type}`);
    await handler(job.payload || {});
    await Job.findByIdAndUpdate(job.id, { status: "done" });
  } catch (error) {
    await Job.findByIdAndUpdate(job.id, { status: "failed", error: error.message });
    logger.error("Worker job failed", { id: job.id, type: job.type, error: error.message });
  }
}

async function pollPendingTranscriptions() {
  if (!config.assemblyAiKey) return;
  const inflight = await Session.find({
    processing_status: { $in: ["transcribing", "analyzing"] },
    assemblyai_job_id: { $ne: null, $exists: true },
  })
    .limit(20)
    .lean();

  for (const session of inflight) {
    try {
      const job = await getTranscriptionJob(session.assemblyai_job_id);
      if (job.status === "completed" || job.status === "error") {
        await completeSessionFromAssemblyJob(String(session._id), job);
        logger.info("Session transcription completed", {
          session_id: String(session._id),
          status: job.status,
        });
      }
    } catch (err) {
      logger.error("Transcription poll failed", {
        session_id: String(session._id),
        error: err.message,
      });
    }
  }
}

async function run() {
  await connectDb();
  logger.info("Worker started");
  setInterval(() => {
    processOneJob().catch((error) => logger.error("Worker tick error", { error: error.message }));
  }, 1500);
  setInterval(() => {
    pollPendingTranscriptions().catch((error) =>
      logger.error("Transcription poll tick error", { error: error.message })
    );
  }, 8000);
}

run().catch((error) => {
  logger.error("Worker failed to start", { error: error.message });
  process.exit(1);
});
