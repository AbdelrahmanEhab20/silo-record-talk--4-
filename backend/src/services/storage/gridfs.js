import mongoose from "mongoose";
import { Readable } from "stream";

const BUCKET_NAME = "audio";
let cachedBucket = null;

function getBucket() {
  if (cachedBucket) return cachedBucket;
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Mongo not connected; cannot init GridFS bucket");
  }
  cachedBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME,
  });
  return cachedBucket;
}

export async function storeAudioBuffer({ buffer, filename, mimeType, userEmail }) {
  const bucket = getBucket();
  return await new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(filename || `audio-${Date.now()}.webm`, {
      contentType: mimeType || "application/octet-stream",
      metadata: {
        user_email: userEmail || null,
        uploaded_at: new Date(),
      },
    });
    stream.on("error", reject);
    stream.on("finish", () => {
      resolve({
        file_id: String(stream.id),
        filename: stream.filename,
        length: stream.length,
      });
    });
    Readable.from(buffer).pipe(stream);
  });
}

export async function findAudioFile(fileId) {
  const bucket = getBucket();
  let id;
  try {
    id = new mongoose.Types.ObjectId(fileId);
  } catch {
    return null;
  }
  const files = await bucket.find({ _id: id }).toArray();
  return files[0] || null;
}

export function openAudioDownload(fileId) {
  const bucket = getBucket();
  const id = new mongoose.Types.ObjectId(fileId);
  return bucket.openDownloadStream(id);
}

export async function deleteAudioFile(fileId) {
  const bucket = getBucket();
  try {
    const id = new mongoose.Types.ObjectId(fileId);
    await bucket.delete(id);
    return true;
  } catch {
    return false;
  }
}
