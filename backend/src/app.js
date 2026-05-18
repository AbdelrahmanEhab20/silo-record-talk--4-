import cors from "cors";
import express from "express";
import { config } from "./config/index.js";
import { attachUser } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

const app = express();

const allowedOrigins = new Set([
  ...config.corsOrigins,
  config.frontendUrl,
].filter(Boolean));

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  // Vercel production + preview deployments
  if (/^https:\/\/silo-record-talk(-[a-z0-9-]+)?\.vercel\.app$/i.test(origin)) {
    return true;
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, origin || true);
      } else {
        console.warn("[cors] blocked origin:", origin);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(attachUser);
app.use("/api", routes);
app.use(errorHandler);

export default app;
