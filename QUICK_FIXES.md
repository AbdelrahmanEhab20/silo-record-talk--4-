# Quick Fix Checklist
## Critical Issues + Immediate Actions

**Estimated time**: 4-8 hours to resolve all "HIGH" items

---

## 🔴 HIGH PRIORITY (Do Today)

### ✅ ITEM 1: Add Missing MongoDB Models
**File**: `backend/src/models/index.js`  
**Time**: 30 mins

**What to add** (after line 68, before exports):
```javascript
const WorkspaceMemberSchema = new mongoose.Schema(
  {
    workspace_id: { type: String, required: true, index: true },
    user_email: { type: String, required: true, index: true },
    role: { type: String, enum: ["owner", "member"], default: "member" },
    status: { type: String, enum: ["active", "invited"], default: "active" }
  },
  baseOptions
);

const SharedSessionSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true, index: true },
    workspace_id: { type: String, required: true, index: true },
    permission: { type: String, enum: ["view", "edit"], default: "view" },
    shared_by_email: { type: String, required: true },
    shared_at: { type: Date, default: Date.now }
  },
  baseOptions
);

const PublicSessionShareSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true, index: true },
    share_token: { type: String, required: true, unique: true, index: true },
    expiration_date: Date,
    access_count: { type: Number, default: 0 }
  },
  baseOptions
);

const StudyRecordSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, index: true },
    session_id: { type: String, index: true },
    topic: String,
    answer: String,
    spaced_rep_score: { type: Number, default: 0 },
    next_review_date: Date,
    review_count: { type: Number, default: 0 }
  },
  baseOptions
);

const KeywordSchema = new mongoose.Schema(
  {
    workspace_id: { type: String, required: true, index: true },
    keyword: { type: String, required: true },
    search_volume: Number,
    difficulty: Number,
    status: { type: String, default: "pending" }
  },
  baseOptions
);

// Models exports (add to existing exports around line 75)
export const WorkspaceMember = mongoose.models.WorkspaceMember || mongoose.model("WorkspaceMember", WorkspaceMemberSchema);
export const SharedSession = mongoose.models.SharedSession || mongoose.model("SharedSession", SharedSessionSchema);
export const PublicSessionShare = mongoose.models.PublicSessionShare || mongoose.model("PublicSessionShare", PublicSessionShareSchema);
export const StudyRecord = mongoose.models.StudyRecord || mongoose.model("StudyRecord", StudyRecordSchema);
export const Keyword = mongoose.models.Keyword || mongoose.model("Keyword", KeywordSchema);

// Update entityModels export to include:
export const entityModels = {
  User,
  Session,
  Workspace,
  CreditLedger,
  PlanSubscription,
  WorkspaceMember,
  SharedSession,
  PublicSessionShare,
  StudyRecord,
  Keyword
};
```

**Why**: Frontend pages (Workspaces, LearningProgress, etc.) try to access these entities.

---

### ✅ ITEM 2: Fix Session Schema
**File**: `backend/src/models/index.js`  
**Time**: 30 mins

**Update SessionSchema** (around line 20):
```javascript
const SessionSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, index: true },
    title: String,
    duration: { type: Number, default: 0 },
    transcript_text: String,
    transcript_file_url: String,
    audio_file_url: String,
    video_url: String,
    source: String,
    processing_status: { type: String, default: "pending", index: true },
    tags: [String],
    summary_text: String,
    manual_notes: [String],
    // ↓ ADD THESE FIELDS:
    parent_session_id: { type: String, index: true },
    is_subsession: { type: Boolean, default: false },
    is_flagged: { type: Boolean, default: false },
    folder: String,
    created_date: { type: Date, default: Date.now },
    storage_tier: { type: String, enum: ["hot", "cold", "archived"], default: "hot" },
    source_classification: String,
    processed_at: Date
  },
  baseOptions
);
```

**Why**: Home page filters by `storage_tier`, `is_subsession`, `is_flagged`, `folder`. Without these, filtering breaks.

---

### ✅ ITEM 3: Implement File Upload
**File**: `backend/src/routes/index.js`  
**Time**: 1-2 hours (depending on storage choice)

**Option A: Use MongoDB GridFS** (simplest for now):

```bash
npm install --save mongodb-gridfs
```

**Update the route** (around line 128):
```javascript
import { GridFSBucket } from "mongodb";

// After connectDb in server.js:
const db = mongoose.connection.db;
export const gridFSBucket = new GridFSBucket(db);

// In routes/index.js:
import { gridFSBucket } from "../server.js";

router.post("/integrations/core/upload-file", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { message: "No file provided" } });
  }
  
  try {
    const uploadStream = gridFSBucket.openUploadStream(req.file.originalname, {
      metadata: { userId: req.user.email, uploadedAt: new Date() }
    });
    
    uploadStream.end(req.file.buffer);
    
    uploadStream.on("finish", () => {
      res.json({ file_url: `/api/files/download/${uploadStream.id}` });
    });
    
    uploadStream.on("error", (err) => {
      res.status(500).json({ error: { message: err.message } });
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// Add download endpoint:
router.get("/files/download/:id", async (req, res) => {
  try {
    const { ObjectId } = require("bson");
    const downloadStream = gridFSBucket.openDownloadStream(new ObjectId(req.params.id));
    downloadStream.pipe(res);
  } catch (err) {
    res.status(404).json({ error: { message: "File not found" } });
  }
});
```

**Option B: Use AWS S3** (better for production):

```bash
npm install --save @aws-sdk/client-s3
```

```javascript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

router.post("/integrations/core/upload-file", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: { message: "No file provided" } });
  
  const key = `transcripts/${req.user.email}/${Date.now()}-${req.file.originalname}`;
  
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));
    
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    res.json({ file_url: fileUrl });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});
```

**Why**: Long transcripts fail to save. Recording page can't upload files.

---

### ✅ ITEM 4: Implement Real Transcription
**File**: `backend/src/services/functionHandlers.js`  
**Time**: 2-3 hours

**Add at top of file**:
```javascript
import { config } from "../config/index.js";

// Helper to call AssemblyAI
async function transcribeWithAssemblyAI(audioUrl) {
  const apiUrl = "https://api.assemblyai.com/v2/transcribe";
  
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": config.assemblyAiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: "en"
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`AssemblyAI error: ${data.error}`);
  }
  
  // Poll for completion
  let result = data;
  while (result.status !== "completed" && result.status !== "error") {
    await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
    const pollResponse = await fetch(`${apiUrl}/${result.id}`, {
      headers: { "Authorization": config.assemblyAiKey }
    });
    result = await pollResponse.json();
  }
  
  if (result.status === "error") {
    throw new Error(`Transcription failed: ${result.error}`);
  }
  
  return result.text;
}

// Or use OpenAI Whisper:
async function transcribeWithWhisper(audioUrl) {
  const FormData = require("form-data");
  const fs = require("fs");
  
  // Download audio file first
  const response = await fetch(audioUrl);
  const buffer = await response.buffer();
  
  const formData = new FormData();
  formData.append("file", buffer, "audio.m4a");
  formData.append("model", "whisper-1");
  formData.append("language", "en");
  
  const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.openaiApiKey}`
    },
    body: formData
  });
  
  const result = await whisperResponse.json();
  if (!whisperResponse.ok) {
    throw new Error(`Whisper error: ${result.error.message}`);
  }
  
  return result.text;
}
```

**Update transcribeAudio handler**:
```javascript
async transcribeAudio(payload) {
  const audioUrl = payload?.audio_file_url;
  if (!audioUrl) {
    return ok({ transcript: "", provider: "whisper" });
  }
  
  try {
    // Choose provider based on env config
    const transcript = config.assemblyAiKey
      ? await transcribeWithAssemblyAI(audioUrl)
      : await transcribeWithWhisper(audioUrl);
    
    return ok({ transcript, provider: "whisper" });
  } catch (error) {
    console.error("Transcription failed:", error);
    return ok({ transcript: "", error: error.message });
  }
}
```

**In `config/index.js`, make sure these are exported**:
```javascript
export const config = {
  // ... existing ...
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  assemblyAiKey: process.env.ASSEMBLYAI_API_KEY || "",
};
```

**Why**: Recording page shows "transcript" but it's always empty. Users can't see what they're saying.

---

## 🟡 MEDIUM PRIORITY (Do This Week)

### ✅ ITEM 5: Add Input Validation

**Install schema validator**:
```bash
npm install --save zod
```

**Create file**: `backend/src/lib/schemas.js`
```javascript
import { z } from "zod";

export const schemas = {
  createSession: z.object({
    title: z.string().min(1),
    user_email: z.string().email(),
    duration: z.number().positive().optional(),
    transcript_text: z.string().optional(),
    tags: z.array(z.string()).optional()
  }),
  createUser: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    full_name: z.string().optional()
  }),
  deductMinutes: z.object({
    user_email: z.string().email(),
    minutes: z.number().positive(),
    session_id: z.string().optional()
  })
};

export function validateRequest(schema, data) {
  try {
    return schema.parse(data);
  } catch (err) {
    throw { status: 400, message: err.errors[0].message };
  }
}
```

**Use in routes**:
```javascript
router.post("/entities/Session", requireAuth, async (req, res) => {
  try {
    const validated = validateRequest(schemas.createSession, {
      ...req.body,
      user_email: req.user.email // Force user context
    });
    const doc = await Session.create(validated);
    res.status(201).json(doc);
  } catch (err) {
    res.status(err.status || 500).json({ error: { message: err.message } });
  }
});
```

---

### ✅ ITEM 6: Implement Insights Generation

**Update generateInsights handler**:
```javascript
async generateInsights(payload) {
  const transcriptText = payload?.transcript_text || "";
  if (!transcriptText) return ok({ insights: [] });
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Extract 3-5 key insights from this meeting transcript. Return as JSON array of strings."
          },
          {
            role: "user",
            content: `Transcript:\n${transcriptText}`
          }
        ]
      })
    });
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    const insights = JSON.parse(content);
    
    return ok({ insights });
  } catch (error) {
    console.error("Insights generation failed:", error);
    return ok({ insights: [], error: error.message });
  }
}
```

---

## 🟢 LOWER PRIORITY (Next Sprint)

### ITEM 7: Wire Stripe Webhooks
- Implement `createCheckoutSession` → real Stripe sessions
- Implement `stripeWebhook` → update credits on payment

### ITEM 8: Add Logging
- Wrap all routes in error logging
- Log important events (login, session created, payment received)

### ITEM 9: Add Rate Limiting
- Install `express-rate-limit`
- Apply to auth routes

### ITEM 10: Security Audit
- Review JWT expiry times
- Test CORS restrictions
- Check for SQL injection (Mongoose is safe)
- Validate all user inputs

---

## 📋 TESTING CHECKLIST

After making changes, test:

```bash
# 1. Backend starts without errors
cd backend && npm run dev
# Should see: "Mongo connected" + "Silo backend running"

# 2. Auth works
curl -X POST http://localhost:5000/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
# Should return: { token: "...", user: { email: "..." } }

# 3. Entity CRUD works
curl -X POST http://localhost:5000/api/entities/Session \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"user_email": "test@example.com", "title": "Test", "duration": 60}'
# Should return: { _id: "...", user_email: "...", ... }

# 4. New models work
curl http://localhost:5000/api/entities/StudyRecord \
  -H "Authorization: Bearer <token>"
# Should return: [] (empty array, not 404)

# 5. File upload works
curl -X POST http://localhost:5000/api/integrations/core/upload-file \
  -H "Authorization: Bearer <token>" \
  -F "file=@transcript.txt"
# Should return: { file_url: "..." } (not fake URL)

# 6. Transcription works
curl -X POST http://localhost:5000/api/functions/transcribeAudio/invoke \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"audio_file_url": "https://example.com/audio.m4a"}'
# Should return: { data: { transcript: "..." } } (not empty)
```

---

## 💰 COST ESTIMATE

After implementing all fixes:

| Service | Cost/Month | Notes |
|---------|-----------|-------|
| Render API | $12 | Standard (always-on) |
| Render Worker | $7 | Starter (background jobs) |
| MongoDB Atlas | $0-57 | Free tier for <1GB, then $0.57/GB |
| Vercel Frontend | $0-20 | Hobby free, Pro $20 if you want features |
| OpenAI API | ~$20 | ~$0.002-0.03/transcription (for moderate use) |
| AWS S3 | ~$1 | For file storage (~1MB/month) |
| **Total** | ~$40-90/mo | Scales well to 1000s users |

---

## ⏱️ TOTAL TIME ESTIMATE

| Task | Time | Difficulty |
|------|------|------------|
| Add models | 30m | Easy ✅ |
| Fix schema | 30m | Easy ✅ |
| File upload | 1-2h | Medium 🟡 |
| Real transcription | 2-3h | Medium 🟡 |
| Input validation | 2h | Medium 🟡 |
| Insights generation | 1-2h | Medium 🟡 |
| **Phase 1 Total** | 7-11 hours | **Can do today/tomorrow** |
| Stripe integration | 3-4h | Medium 🟡 |
| Remaining handlers | 4-6h | Medium 🟡 |
| Logging & monitoring | 2-3h | Medium 🟡 |
| Security audit | 2-3h | Hard 🔴 |
| **Full Implementation** | 18-26 hours | **1 week solo, 2-3 days team** |

---

## 🎯 RECOMMENDED NEXT STEP

**Do Items 1-4 today** (7-11 hours). This gets you to ~60% feature parity and will let you:
- ✅ Test with users
- ✅ See what breaks
- ✅ Prioritize what to build next
- ✅ Validate product-market fit

**Then do Items 5-10** based on user feedback and revenue potential.

---

**Questions?** Review the full assessment at `/CODEBASE_ASSESSMENT.md`
