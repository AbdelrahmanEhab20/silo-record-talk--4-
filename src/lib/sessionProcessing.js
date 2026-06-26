/** Statuses that mean transcription/analysis is still in progress */
export const ACTIVE_PROCESSING_STATUSES = new Set([
  "pending",
  "processing",
  "transcribing",
  "transcript_ready",
  "analyzing",
]);

export function isActiveProcessingStatus(status) {
  return ACTIVE_PROCESSING_STATUSES.has(status);
}
