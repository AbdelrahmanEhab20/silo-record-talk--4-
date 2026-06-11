import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { storeAudioBuffer, findAudioFile, openAudioDownload } from "../services/storage/gridfs.js";
import { config } from "../config/index.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

function buildFileUrl(req, fileId) {
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  const host = req.get("host");
  const base = `${proto}://${host}`;
  return `${base}/api/files/${fileId}`;
}

router.post("/", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: { message: "file is required" } });
    const stored = await storeAudioBuffer({
      buffer: req.file.buffer,
      filename: req.file.originalname || `upload-${Date.now()}`,
      mimeType: req.file.mimetype,
      userEmail: req.user?.email || null,
    });
    res.json({
      file_id: stored.file_id,
      file_url: buildFileUrl(req, stored.file_id),
      filename: stored.filename,
      size: stored.length,
      mime_type: req.file.mimetype,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const file = await findAudioFile(req.params.id);
    if (!file) return res.status(404).json({ error: { message: "File not found" } });

    const contentType = file.contentType || "application/octet-stream";
    res.set("Content-Type", contentType);
    res.set("Content-Length", String(file.length));
    res.set("Accept-Ranges", "bytes");

    // GridFS file IDs are immutable — once stored, the bytes never change.
    // Images (avatars) benefit from aggressive caching so they don't re-fetch
    // on every page load. Audio remains private with shorter caching.
    if (contentType.startsWith("image/")) {
      res.set("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.set("Cache-Control", "private, max-age=3600");
    }

    const stream = openAudioDownload(req.params.id);
    stream.on("error", (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

export { router as filesRouter, buildFileUrl };
export const FILES_CONFIG = { publicBase: config.frontendUrl };
