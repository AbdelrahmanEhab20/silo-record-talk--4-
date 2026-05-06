import { CreditLedger, Session, User } from "../models/index.js";

function ok(data) {
  return { data };
}

export const functionHandlers = {
  async transcribeAudio(payload) {
    return ok({ transcript: payload?.transcript_text || "", provider: "owned-backend" });
  },

  async processSessionBackground(payload) {
    const sessionId = payload?.session_id;
    if (!sessionId) throw new Error("session_id is required");
    await Session.findByIdAndUpdate(sessionId, { processing_status: "done" });
    return ok({ success: true, session_id: sessionId, status: "done" });
  },

  async deductMinutes(payload) {
    const minutes = Number(payload?.minutes || 0);
    const userEmail = String(payload?.user_email || "");
    if (!userEmail || !minutes) return ok({ success: false });
    await User.updateOne({ email: userEmail }, { $inc: { minutes_balance: -minutes } }, { upsert: true });
    await CreditLedger.create({ user_email: userEmail, type: "minutes", delta: -minutes, reason: "deductMinutes", session_id: payload?.session_id, charge_key: payload?.charge_key });
    return ok({ success: true });
  },

  async deductCredits(payload) {
    const credits = Number(payload?.credits || 0);
    const userEmail = String(payload?.user_email || "");
    if (!userEmail || !credits) return ok({ success: false });
    await User.updateOne({ email: userEmail }, { $inc: { credits_balance: -credits } }, { upsert: true });
    await CreditLedger.create({ user_email: userEmail, type: "credits", delta: -credits, reason: "deductCredits", session_id: payload?.session_id, charge_key: payload?.charge_key });
    return ok({ success: true });
  },

  async getUserCredits(payload) {
    const userEmail = String(payload?.user_email || "");
    const user = await User.findOne({ email: userEmail }).lean();
    return ok({ minutes: user?.minutes_balance || 0, credits: user?.credits_balance || 0 });
  },

  async processVideoUrl() {
    return ok({ transcript: "", duration_seconds: 0 });
  },

  async uploadTranscriptFile() {
    return ok({ file_url: "" });
  },

  async stripeWebhook() {
    return ok({ success: true });
  },

  async assemblyAIWebhook() {
    return ok({ success: true });
  },

  async transcribeChunk() {
    return ok({ transcript_chunk: "" });
  },

  async transcribeChunkAssembly() {
    return ok({ transcript_chunk: "" });
  },

  async generateStructuredContent() {
    return ok({ summary_text: "", action_items: [] });
  },

  async generateInsights() {
    return ok({ insights: [] });
  },

  async generateFlashcards() {
    return ok({ flashcards: [] });
  },

  async generateMeetingDocx() {
    return ok({ file_url: "" });
  },

  async classifySessionSources() {
    return ok({ source_classification: [] });
  },

  async validateSourceClassification() {
    return ok({ valid: true });
  },

  async fixSourceClassification() {
    return ok({ fixed: true });
  },

  async autoIdentifySpeakers() {
    return ok({ speakers: [] });
  },

  async triggerSpeakerIdentification() {
    return ok({ queued: true });
  },

  async diarizeSpeakers() {
    return ok({ speakers: [] });
  },

  async archiveOldSessions() {
    return ok({ archived: 0 });
  },

  async rewardAdMinutes(payload) {
    const userEmail = String(payload?.user_email || "");
    const minutes = Number(payload?.minutes || 0);
    if (userEmail && minutes > 0) {
      await User.updateOne({ email: userEmail }, { $inc: { minutes_balance: minutes } }, { upsert: true });
      await CreditLedger.create({ user_email: userEmail, type: "minutes", delta: minutes, reason: "rewardAdMinutes" });
    }
    return ok({ success: true });
  }
};
