// Shared transcript parsing helpers. The AssemblyAI pipeline emits lines in the
// shape `"[mm:ss] Speaker X: text"` (see backend/src/services/transcription/
// assemblyai.js -> formatAssemblyTranscript). Multi-part recordings also emit a
// `"[Part N]"` header line between subsessions. Every helper here works on that
// canonical format, plus tolerates plain text lines that lack a timestamp.

const SEGMENT_RE = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+?):\s*(.*)/;
const PART_HEADER_RE = /^\[Part\s+(\d+)\]$/i;

export const TRUNCATED_MARKERS = [
  "...[truncated",
  "see transcript_file_url",
  "upload failed; transcript truncated",
  "[upload failed; transcript truncated]",
];

export function isTruncatedPreview(text) {
  const t = String(text || "");
  return TRUNCATED_MARKERS.some((m) => t.includes(m));
}

export function parseSegments(text) {
  if (!text) return [];
  return text.split("\n").map((line, i) => {
    const partMatch = line.trim().match(PART_HEADER_RE);
    if (partMatch) {
      return {
        id: i,
        isPartHeader: true,
        partNum: parseInt(partMatch[1], 10),
        raw: line,
        timestamp: "",
        speaker: "",
        text: line,
      };
    }
    const m = line.match(SEGMENT_RE);
    if (m) return { id: i, timestamp: m[1], speaker: m[2].trim(), text: m[3], raw: line };
    return { id: i, timestamp: "", speaker: "", text: line, raw: line };
  });
}

export function segmentsToText(segments) {
  return segments
    .map((s) => {
      if (s.timestamp && s.speaker) return `[${s.timestamp}] ${s.speaker}: ${s.text}`;
      if (s.speaker) return `${s.speaker}: ${s.text}`;
      return s.text;
    })
    .join("\n");
}

export function timestampToSeconds(ts) {
  if (!ts) return 0;
  const parts = String(ts).split(":").map((n) => Number(n) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

/**
 * Largest `[HH:MM:SS]` / `[MM:SS]` timestamp found across the parsed segments,
 * in seconds. Used by the load-more pagination to decide whether to show the
 * "Load More" button and to compute the total transcript length.
 */
export function transcriptSpanSeconds(segments) {
  let max = 0;
  for (const s of segments) {
    if (!s?.timestamp) continue;
    const sec = timestampToSeconds(s.timestamp);
    if (sec > max) max = sec;
  }
  return max;
}
