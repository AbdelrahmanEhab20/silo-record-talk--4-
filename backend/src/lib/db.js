import mongoose from "mongoose";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

export async function connectDb() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  logger.info("Mongo connected");
}
