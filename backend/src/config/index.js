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

function normalizeS3Endpoint(endpoint, bucket) {
  let value = String(endpoint || "").trim().replace(/\/+$/, "");
  if (bucket && value.endsWith(`/${bucket}`)) {
    value = value.slice(0, -(bucket.length + 1));
  }
  return value;
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
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  assemblyAiKey: process.env.ASSEMBLYAI_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "",
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID || "",
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
  microsoftRedirectUri: process.env.MICROSOFT_REDIRECT_URI || "",
  microsoftTenant: process.env.MICROSOFT_TENANT || "common",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  storageProvider: process.env.STORAGE_PROVIDER || "local",
  s3Bucket: process.env.S3_BUCKET || "",
  s3Region: process.env.S3_REGION || "auto",
  s3Endpoint: normalizeS3Endpoint(process.env.S3_ENDPOINT, process.env.S3_BUCKET),
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL || "",
  assetUploadMaxSize: Number(process.env.ASSET_UPLOAD_MAX_SIZE) || 5242880,
};
