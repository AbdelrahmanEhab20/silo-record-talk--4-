import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

function parseList(input) {
  return String(input || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function validateProd() {
  if (!isProduction) return;
  const required = ["MONGO_URI", "JWT_SECRET", "FRONTEND_URL", "CORS_ORIGINS"];
  const missing = required.filter((key) => !String(process.env[key] || "").trim());
  if (missing.length) {
    throw new Error(`Missing required production env vars: ${missing.join(", ")}`);
  }
}

validateProd();

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/silo_dev",
  jwtSecret: process.env.JWT_SECRET || "silo-dev-secret",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  corsOrigins: parseList(process.env.CORS_ORIGINS || "http://localhost:5173"),
  defaultTenantId: process.env.DEFAULT_TENANT_ID || "default",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  assemblyAiKey: process.env.ASSEMBLYAI_API_KEY || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ""
};
