import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "../../config/index.js";

const ALLOWED_FOLDERS = new Set(["avatars", "branding/logo", "branding/favicon"]);

export const ASSET_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export function isAllowedAssetFolder(folder) {
  return ALLOWED_FOLDERS.has(folder);
}

export function isR2AssetsEnabled() {
  return (
    config.storageProvider === "r2" &&
    Boolean(config.s3Bucket) &&
    Boolean(config.s3Endpoint) &&
    Boolean(config.s3AccessKeyId) &&
    Boolean(config.s3SecretAccessKey) &&
    Boolean(config.s3PublicBaseUrl)
  );
}

function getS3Client() {
  return new S3Client({
    region: config.s3Region || "auto",
    endpoint: config.s3Endpoint,
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
    forcePathStyle: true,
    // R2 does not support AWS SDK default CRC32 checksums (v3.729+).
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function sanitizeFilename(name) {
  const base = String(name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(0, 180) || `upload-${Date.now()}`;
}

export async function uploadAsset({ buffer, filename, mimeType, folder, userEmail }) {
  if (!isR2AssetsEnabled()) {
    throw new Error("R2 asset storage is not configured");
  }
  if (!isAllowedAssetFolder(folder)) {
    throw new Error(`Invalid asset folder: ${folder}`);
  }

  const key = `${folder}/${Date.now()}_${sanitizeFilename(filename)}`;
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
      Metadata: userEmail ? { user_email: userEmail.slice(0, 256) } : undefined,
    })
  );

  const base = config.s3PublicBaseUrl.replace(/\/$/, "");
  return {
    file_url: `${base}/${key}`,
    key,
  };
}
