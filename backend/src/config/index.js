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
  const frontendUrl = String(process.env.FRONTEND_URL || "").trim();
  const corsOrigins = parseList(process.env.CORS_ORIGINS);
  if (!corsOrigins.includes(frontendUrl)) {
    throw new Error(
      "CORS_ORIGINS must include FRONTEND_URL in production. " +
        `FRONTEND_URL=${frontendUrl}, CORS_ORIGINS=${corsOrigins.join(",")}`
    );
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
  firstSystemAdminEmail: String(process.env.FIRST_SYSTEM_ADMIN_EMAIL || "").trim().toLowerCase(),
  emailProvider: process.env.EMAIL_PROVIDER || "console",
  resendApiKey: process.env.RESEND_API_KEY || "",
  sendGridApiKey: process.env.SENDGRID_API_KEY || "",
  sendGridInviteTemplateId: process.env.SENDGRID_INVITE_TEMPLATE_ID || "",
  emailFrom: process.env.EMAIL_FROM || "",
  emailFromName: process.env.EMAIL_FROM_NAME || "",
  emailReplyTo: process.env.EMAIL_REPLY_TO || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  assemblyAiKey: process.env.ASSEMBLYAI_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ""
};
