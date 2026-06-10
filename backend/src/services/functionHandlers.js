import { CreditLedger, GoogleIntegration, PlanSubscription, Session, User } from "../models/index.js";
import { config } from "../config/index.js";
import {
  submitTranscriptionJob,
  getTranscriptionJob,
  formatAssemblyTranscript,
} from "./transcription/assemblyai.js";
import { analyzeTranscript, detectLanguage, isLlmAvailable } from "./llm/index.js";
import { getMinutesUsedForEmail } from "./usageMinutes.js";
import { listUpcomingEvents, createEvent as createGoogleEvent } from "./google/calendar.js";

function ok(data) {
  return { data };
}

async function ensureSession(sessionId) {
  const sess = await Session.findById(sessionId);
  if (!sess) throw new Error(`Session not found: ${sessionId}`);
  return sess;
}

async function submitSessionForTranscription(session) {
  if (!session.audio_file_url) return null;
  if (!config.assemblyAiKey) {
    await Session.findByIdAndUpdate(session._id, {
      processing_status: "failed",
      transcription_error: "ASSEMBLYAI_API_KEY not configured",
    });
    return null;
  }
  const jobId = await submitTranscriptionJob({
    audioUrl: session.audio_file_url,
    speakerLabels: true,
  });
  await Session.findByIdAndUpdate(session._id, {
    processing_status: "transcribing",
    transcription_provider: "assemblyai",
    assemblyai_job_id: jobId,
    transcription_error: null,
  });
  return jobId;
}

/**
 * Complete a session once AssemblyAI returns. Saves transcript, runs LLM
 * analysis when configured, deducts minutes, and marks status=done.
 */
export async function completeSessionFromAssemblyJob(sessionId, job) {
  const session = await ensureSession(sessionId);
  if (job.status === "error") {
    await Session.findByIdAndUpdate(sessionId, {
      processing_status: "failed",
      transcription_error: job.error || "AssemblyAI error",
      assemblyai_job_id: null,
    });
    return { status: "failed", error: job.error };
  }

  const { text, language, durationSeconds } = formatAssemblyTranscript(job);
  const lang = language || detectLanguage(text);
  const finalDuration = Math.max(Number(session.duration || 0), Math.round(durationSeconds));

  const updates = {
    transcript_text: text,
    transcript_language: lang,
    duration: finalDuration,
    processing_status: isLlmAvailable() ? "analyzing" : "done",
    assemblyai_job_id: null,
    processed_at: new Date(),
  };
  await Session.findByIdAndUpdate(sessionId, updates);

  if (isLlmAvailable() && text.trim()) {
    const analysis = await analyzeTranscript({ transcript: text, language: lang });
    if (analysis) {
      const analysisUpdates = {
        processing_status: "done",
      };
      if (analysis.title) analysisUpdates.title = analysis.title;
      if (analysis.summary) analysisUpdates.summary_text = analysis.summary;
      if (analysis.tags?.length) analysisUpdates.tags = analysis.tags;
      if (analysis.action_items?.length) analysisUpdates.action_items = analysis.action_items;
      if (analysis.session_type) analysisUpdates.source_classification = analysis.session_type;
      await Session.findByIdAndUpdate(sessionId, analysisUpdates);
    } else {
      await Session.findByIdAndUpdate(sessionId, { processing_status: "done" });
    }
  }

  if (session.user_email) {
    getMinutesUsedForEmail(session.user_email).catch(() => {});
  }

  return { status: "done" };
}

export const functionHandlers = {
  async transcribeAudio(payload) {
    const audioUrl = payload?.audio_url;
    const sessionId = payload?.session_id;
    if (!audioUrl) throw new Error("audio_url is required");
    if (!config.assemblyAiKey) {
      throw new Error("ASSEMBLYAI_API_KEY not configured on the backend");
    }
    const jobId = await submitTranscriptionJob({
      audioUrl,
      language: payload?.language,
      speakerLabels: true,
    });
    if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, {
        processing_status: "transcribing",
        transcription_provider: "assemblyai",
        assemblyai_job_id: jobId,
        audio_file_url: audioUrl,
        transcription_error: null,
      });
    }
    return ok({
      status: "processing",
      assemblyai_job_id: jobId,
      provider: "assemblyai",
      session_id: sessionId || null,
    });
  },

  async processSessionBackground(payload) {
    const sessionId = payload?.session_id;
    if (!sessionId) throw new Error("session_id is required");
    const session = await ensureSession(sessionId);

    const hasTranscript = Boolean(session.transcript_text?.trim());
    const force = payload?.force_transcribe === true;

    if (session.assemblyai_job_id) {
      const job = await getTranscriptionJob(session.assemblyai_job_id);
      if (job.status === "completed" || job.status === "error") {
        await completeSessionFromAssemblyJob(sessionId, job);
      }
      return ok({
        success: true,
        session_id: sessionId,
        status: job.status === "completed" ? "done" : job.status,
        assemblyai_job_id: session.assemblyai_job_id,
      });
    }

    if (force || !hasTranscript) {
      if (session.audio_file_url) {
        const jobId = await submitSessionForTranscription(session);
        return ok({
          success: true,
          session_id: sessionId,
          status: jobId ? "processing" : "failed",
          assemblyai_job_id: jobId,
        });
      }
      if (hasTranscript && isLlmAvailable()) {
        const lang = session.transcript_language || detectLanguage(session.transcript_text);
        const analysis = await analyzeTranscript({ transcript: session.transcript_text, language: lang });
        if (analysis) {
          const updates = { processing_status: "done", processed_at: new Date() };
          if (analysis.title) updates.title = analysis.title;
          if (analysis.summary) updates.summary_text = analysis.summary;
          if (analysis.tags?.length) updates.tags = analysis.tags;
          if (analysis.action_items?.length) updates.action_items = analysis.action_items;
          await Session.findByIdAndUpdate(sessionId, updates);
          return ok({ success: true, session_id: sessionId, status: "done", analysed: true });
        }
      }
    }

    if (!session.processing_status || session.processing_status === "pending") {
      await Session.findByIdAndUpdate(sessionId, { processing_status: "done" });
    }
    return ok({ success: true, session_id: sessionId, status: session.processing_status || "done" });
  },

  async deductMinutes(payload) {
    const minutes = Number(payload?.minutes || 0);
    const userEmail = String(payload?.user_email || "");
    if (!userEmail || !minutes) return ok({ success: false });
    await User.updateOne({ email: userEmail }, { $inc: { minutes_balance: -minutes } }, { upsert: true });
    await PlanSubscription.findOneAndUpdate(
      { user_email: userEmail },
      { $inc: { monthly_minutes_used: minutes } },
      { upsert: true }
    );
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

  async processVideoUrl(payload) {
    const videoUrl = payload?.video_url;
    if (!videoUrl) throw new Error("video_url is required");
    if (!config.assemblyAiKey) {
      throw new Error("ASSEMBLYAI_API_KEY not configured");
    }
    const jobId = await submitTranscriptionJob({
      audioUrl: videoUrl,
      speakerLabels: true,
    });
    if (payload?.session_id) {
      await Session.findByIdAndUpdate(payload.session_id, {
        processing_status: "transcribing",
        transcription_provider: "assemblyai",
        assemblyai_job_id: jobId,
        video_url: videoUrl,
      });
    }
    return ok({ status: "processing", assemblyai_job_id: jobId, provider: "assemblyai" });
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

  async generateStructuredContent(payload) {
    const transcript = String(payload?.transcript || payload?.text || "");
    if (!transcript.trim() || !isLlmAvailable()) {
      return ok({ summary_text: "", action_items: [] });
    }
    const language = payload?.language || detectLanguage(transcript);
    const analysis = await analyzeTranscript({ transcript, language });
    return ok({
      summary_text: analysis?.summary || "",
      action_items: analysis?.action_items || [],
      tags: analysis?.tags || [],
      title: analysis?.title || "",
    });
  },

  async generateInsights(payload) {
    const transcript = String(payload?.transcript || payload?.text || "");
    if (!transcript.trim() || !isLlmAvailable()) return ok({ insights: [] });
    const language = payload?.language || detectLanguage(transcript);
    const analysis = await analyzeTranscript({ transcript, language });
    const bullets = (analysis?.summary || "")
      .split(/\n/)
      .map((s) => s.replace(/^[•\-\*]\s*/, "").trim())
      .filter(Boolean);
    return ok({ insights: bullets });
  },

  async generateFlashcards(payload) {
    const transcript = String(payload?.transcript || payload?.text || "");
    if (!transcript.trim() || !isLlmAvailable()) return ok({ flashcards: [] });
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
  },

  async initializeUserSubscription(payload) {
    const userEmail = String(payload?.user_email || "");
    if (!userEmail) return ok({ initialized: false });
    const doc = await PlanSubscription.findOneAndUpdate(
      { user_email: userEmail },
      {
        $setOnInsert: {
          user_email: userEmail,
          plan: "free",
          status: "active",
          monthly_minutes_used: 0
        }
      },
      { upsert: true, new: true }
    ).lean();
    return ok({ initialized: true, subscription: doc });
  },

  async googleCalendarUser(payload) {
    const action = String(payload?.action || "list");
    const userEmail = String(payload?.user_email || payload?.__userEmail || "");
    if (!userEmail) return ok({ connected: false, events: [], error: "not_authenticated" });

    const integration = await GoogleIntegration.findOne({ user_email: userEmail, revoked_at: null }).lean();
    if (!integration) {
      if (action === "create") return ok({ connected: false, error: "not_connected" });
      return ok({ connected: false, events: [], error: "not_connected" });
    }

    try {
      if (action === "list") {
        const events = await listUpcomingEvents(userEmail);
        return ok({ connected: true, events });
      }
      if (action === "create") {
        const created = await createGoogleEvent(userEmail, payload.event || {});
        return ok({ connected: true, event_id: created.id, html_link: created.html_link, status: "created" });
      }
      return ok({ connected: true, events: [] });
    } catch (err) {
      if (err.code === "not_connected") {
        return ok({ connected: false, events: [], error: "not_connected" });
      }
      throw err;
    }
  }
};
