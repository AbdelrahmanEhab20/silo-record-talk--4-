import { config } from "../../config/index.js";

const ASSEMBLY_BASE = "https://api.assemblyai.com/v2";

function authHeaders() {
  if (!config.assemblyAiKey) {
    throw new Error("ASSEMBLYAI_API_KEY is not configured");
  }
  return { Authorization: config.assemblyAiKey };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTimestamp(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `[${pad(m)}:${pad(s)}]`;
}

/**
 * Upload raw audio bytes directly to AssemblyAI and return the upload_url.
 * Useful when the audio is not already publicly hosted.
 */
export async function uploadAudioToAssemblyAI(buffer) {
  const res = await fetch(`${ASSEMBLY_BASE}/upload`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/octet-stream",
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AssemblyAI upload failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (!data.upload_url) throw new Error("AssemblyAI did not return upload_url");
  return data.upload_url;
}

/**
 * Submit a transcription job. Returns the job id.
 */
export async function submitTranscriptionJob({ audioUrl, language, speakerLabels = true }) {
  const body = {
    audio_url: audioUrl,
    speaker_labels: speakerLabels,
    speech_models: ["universal"],
  };
  if (language) {
    body.language_code = language;
  } else {
    body.language_detection = true;
  }

  const res = await fetch(`${ASSEMBLY_BASE}/transcript`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AssemblyAI submit failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (!data.id) throw new Error("AssemblyAI did not return job id");
  return data.id;
}

export async function getTranscriptionJob(jobId) {
  const res = await fetch(`${ASSEMBLY_BASE}/transcript/${jobId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AssemblyAI poll failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Convert an AssemblyAI completed job into our internal transcript format:
 *   "[mm:ss] Speaker A: text..."
 * Falls back to utterances or raw text when richer data is unavailable.
 */
export function formatAssemblyTranscript(job) {
  if (!job) return { text: "", language: null, durationSeconds: 0 };

  const language = job.language_code || null;
  const durationSeconds = Number(job.audio_duration || 0);

  if (Array.isArray(job.utterances) && job.utterances.length > 0) {
    const text = job.utterances
      .map((u) => {
        const speaker = u.speaker ? `Speaker ${u.speaker}: ` : "";
        return `${formatTimestamp(u.start)} ${speaker}${u.text}`.trim();
      })
      .join("\n");
    return { text, language, durationSeconds };
  }

  if (Array.isArray(job.words) && job.words.length > 0) {
    const CHUNK_MS = 5000;
    const lines = [];
    let chunkStart = null;
    let chunkSpeaker = null;
    let chunkWords = [];

    const flush = () => {
      if (!chunkWords.length) return;
      const speakerLabel = chunkSpeaker ? `Speaker ${chunkSpeaker}: ` : "";
      lines.push(`${formatTimestamp(chunkStart)} ${speakerLabel}${chunkWords.join(" ")}`.trim());
      chunkWords = [];
      chunkStart = null;
      chunkSpeaker = null;
    };

    for (const word of job.words) {
      if (chunkStart === null) {
        chunkStart = word.start;
        chunkSpeaker = word.speaker || null;
      }
      const speakerChanged = word.speaker && chunkSpeaker && word.speaker !== chunkSpeaker;
      const elapsed = word.start - chunkStart;
      if (elapsed >= CHUNK_MS || speakerChanged) {
        flush();
        chunkStart = word.start;
        chunkSpeaker = word.speaker || null;
      }
      chunkWords.push(word.text);
    }
    flush();
    return { text: lines.join("\n"), language, durationSeconds };
  }

  return { text: job.text || "", language, durationSeconds };
}

export const ASSEMBLY_TERMINAL_STATUSES = new Set(["completed", "error"]);
