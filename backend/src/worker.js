import { connectDb } from "./lib/db.js";
import { logger } from "./lib/logger.js";
import { Job } from "./models/index.js";
import { functionHandlers } from "./services/functionHandlers.js";

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

async function run() {
  await connectDb();
  logger.info("Worker started");
  setInterval(() => {
    processOneJob().catch((error) => logger.error("Worker tick error", { error: error.message }));
  }, 1500);
}

run().catch((error) => {
  logger.error("Worker failed to start", { error: error.message });
  process.exit(1);
});
