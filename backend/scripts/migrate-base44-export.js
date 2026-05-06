import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { config } from "../src/config/index.js";
import { User, Session, Workspace } from "../src/models/index.js";

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function importCollection(baseDir, fileName, model, mapFn) {
  const fullPath = path.join(baseDir, fileName);
  try {
    const input = await readJson(fullPath);
    const docs = Array.isArray(input) ? input.map(mapFn) : [];
    if (!docs.length) return { fileName, imported: 0 };
    const ops = docs.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id || new mongoose.Types.ObjectId() },
        update: { $set: doc },
        upsert: true
      }
    }));
    await model.bulkWrite(ops);
    return { fileName, imported: docs.length };
  } catch {
    return { fileName, imported: 0 };
  }
}

async function run() {
  const inputDir = process.argv[2];
  if (!inputDir) {
    console.error("Usage: npm run migrate:base44 -- <path-to-export-folder>");
    process.exit(1);
  }

  await mongoose.connect(config.mongoUri);

  const results = await Promise.all([
    importCollection(inputDir, "User.json", User, (x) => x),
    importCollection(inputDir, "Session.json", Session, (x) => x),
    importCollection(inputDir, "Workspace.json", Workspace, (x) => x)
  ]);

  results.forEach((r) => console.log(`${r.fileName}: imported ${r.imported}`));
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
