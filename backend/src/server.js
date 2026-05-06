import app from "./app.js";
import { config } from "./config/index.js";
import { connectDb } from "./lib/db.js";
import { logger } from "./lib/logger.js";

async function start() {
  await connectDb();
  app.listen(config.port, () => {
    logger.info("Silo backend running", { port: config.port, env: config.nodeEnv });
  });
}

start().catch((err) => {
  logger.error("Failed to start backend", { error: err.message });
  process.exit(1);
});
