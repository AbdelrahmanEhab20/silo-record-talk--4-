import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { PlaybackProvider } from "@/lib/PlaybackContext";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Clock, Calendar, Loader2, Trash2, Pencil, Check, X, Users, FileDown, Search, Send, MoreHorizontal, Download, BrainCircuit, RefreshCw } from "lucide-react";
import { SESSION_TYPES } from "@/lib/sessionTypes";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import SingleSessionAudioPlayer from "@/components/session/SingleSessionAudioPlayer";
import ShareSessionModal from "@/components/session/ShareSessionModal";
import ShareLinkModal from "@/components/session/ShareLinkModal";
import TagPills from "@/components/session/TagPills";
import TranscriptEditor from "@/components/session/TranscriptEditor";
import SummarySection from "@/components/session/SummarySection";
import CalendarEventLink from "@/components/session/CalendarEventLink";
import ActionItems from "@/components/session/ActionItems";
import LanguageSelector from "@/components/session/LanguageSelector";
import DraftGenerator from "@/components/session/DraftGenerator";
import SentimentTimeline from "@/components/session/SentimentTimeline";
import AudioUploader from "@/components/session/AudioUploader";
import SubSessionAudioPlayers from "@/components/session/SubSessionAudioPlayers";
import NaturalLanguageSearch from "@/components/session/NaturalLanguageSearch";
import FollowUpEmailDrafter from "@/components/session/FollowUpEmailDrafter";
import MeetingFrictionAnalysis from "@/components/session/MeetingFrictionAnalysis";
import PreviewModal from "@/components/session/PreviewModal";
import GoogleAd from "@/components/ads/GoogleAd";
import AskSilo from "@/components/session/AskSilo";
import FlashcardDisplay from "@/components/session/FlashcardDisplay";
import QuizDisplay from "@/components/session/QuizDisplay";
import EducationalToolsPanel from "@/components/session/EducationalToolsPanel";
import StructuredNotes from "@/components/session/StructuredNotes";
import ManualNotes from "@/components/session/ManualNotes";
import SpeakerTimeline from "@/components/session/SpeakerTimeline";
import VideoPlayer from "@/components/session/VideoPlayer";

// ── Truncation detection ────────────────────────────────────────────────────
const TRUNCATED_MARKERS = [
  "...[truncated",
  "see transcript_file_url",
  "upload failed; transcript truncated",
];

function isTruncatedPreview(text) {
  const t = String(text || "");
  return TRUNCATED_MARKERS.some((m) => t.includes(m));
}

// ── Statuses that mean the pipeline is still running ───────────────────────
const ACTIVE_STATUSES = new Set([
  "pending",
  "processing",
  "transcribing",
  "transcript_ready",
  "analyzing",
]);

export default function SessionDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("id");
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [summaryText, setSummaryText] = useState(null);
  const [transcriptText, setTranscriptText] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [translating, setTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState(null);
  const [translatedTranscript, setTranslatedTranscript] = useState(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [exportingDocx, setExportingDocx] = useState(false);
  const [showSentiment, setShowSentiment] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [flashcards, setFlashcards] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [structuredContent, setStructuredContent] = useState(null);
  const [showShareLink, setShowShareLink] = useState(false);
  const [isRetranscribing, setIsRetranscribing] = useState(false);
  const [manualNotes, setManualNotes] = useState(null); // null = use session.manual_notes

  const pollStartedAtRef = useRef(null);
  const MAX_POLL_MS = 5 * 60 * 1000; // 5 minutes safety window

  const queryClient = useQueryClient();
  const { isDark } = useTheme();

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      setUser(userData);
      const subs = await base44.entities.PlanSubscription.filter({ user_email: userData.email });
      if (subs.length > 0) setSubscription(subs[0]);
    }).catch(() => {});
  }, []);

  // Check if this session has sub-sessions (moved up for polling access)
  const { data: subsessions } = useQuery({
    queryKey: ["subsessions", sessionId],
    queryFn: () => base44.entities.Session.filter({ parent_session_id: sessionId, is_subsession: true }),
    enabled: !!sessionId && !!user,
    staleTime: 30000,
  });
  const hasSubsessions = subsessions && subsessions.length > 0;

  // Helper: check if any subsession is actively processing
  const hasActiveSubsessionProcessing = (subsessions || []).some(
    (s) => ACTIVE_STATUSES.has(s.processing_status)
  );

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", sessionId, user?.email],
    queryFn: async () => {
      if (!user || !sessionId) return null;
      const sess = await base44.entities.Session.get(sessionId);
      if (sess.user_email !== user.email) return null;
      return sess;
    },
    enabled: !!sessionId && !!user,
    staleTime: 30000,
    refetchInterval: (query) => {
      const s = query?.state?.data;
      if (!s) return 5000;

      // Expanded: includes staged statuses from the R5 pipeline
      const isProcessing = ACTIVE_STATUSES.has(s.processing_status);

      const hasTranscript =
        !!(s.transcript_text && s.transcript_text.trim() && !isTruncatedPreview(s.transcript_text)) ||
        !!s.transcript_file_url;
      const hasSummary = !!(s.summary_text && String(s.summary_text).trim());

      // Continue polling while processing OR subsessions processing OR transcript missing OR summary missing
      const shouldPoll = isProcessing || hasActiveSubsessionProcessing || !hasTranscript || !hasSummary;
      if (!shouldPoll) {
        pollStartedAtRef.current = null;
        return false;
      }

      // Start timer once
      if (!pollStartedAtRef.current) pollStartedAtRef.current = Date.now();

      // Stop after max window to avoid infinite polling
      if (Date.now() - pollStartedAtRef.current > MAX_POLL_MS) {
        return false;
      }

      return 5000;
    },
  });

  // Fallback polling invalidation while subsessions are active
  useEffect(() => {
    if (!hasSubsessions) return;

    const active = (subsessions || []).some(
      (s) => ACTIVE_STATUSES.has(s.processing_status)
    );

    if (!active) return;

    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["subsessions", sessionId] });
    }, 5000);

    return () => clearInterval(id);
  }, [hasSubsessions, subsessions, queryClient, sessionId]);

  // ── Transcript hydration: fetch full text when DB preview is truncated ────
  useEffect(() => {
    const loadFullTranscriptIfNeeded = async () => {
      if (!session) return;
      if (!session.transcript_file_url) return;

      // Use whichever text we currently have (local state takes precedence)
      const localText = transcriptText || "";
      const sessionText = session.transcript_text || "";
      const current = localText || sessionText;

      const hasInline = current.trim().length > 0;
      const looksTruncated = !hasInline || isTruncatedPreview(current);

      if (!looksTruncated) return; // Already have full text — nothing to do

      try {
        const res = await fetch(session.transcript_file_url);
        if (!res.ok) throw new Error(`Failed to fetch transcript file: ${res.status}`);
        const fullText = await res.text();
        if (fullText && fullText.trim()) {
          setTranscriptText(fullText);
        }
      } catch (e) {
        console.error("Failed to load full transcript from transcript_file_url:", e);
      }
    };

    loadFullTranscriptIfNeeded();
  }, [session?.id, session?.transcript_text, session?.transcript_file_url]);
  // NOTE: transcriptText intentionally NOT in deps — we only re-hydrate when
  // server data changes, not when local edits happen.

  // ── Sync session → local state when backend delivers new data ─────────────
  useEffect(() => {
    if (!session) return;

    // Sync summary if local is empty
    if (session.summary_text && (!summaryText || !String(summaryText).trim())) {
      setSummaryText(session.summary_text);
    }

    // Sync transcript if local is empty or still a truncation placeholder
    const localEmpty = !transcriptText || !String(transcriptText).trim();
    const localTruncated = isTruncatedPreview(transcriptText || "");
    if (session.transcript_text && (localEmpty || localTruncated) && !isTruncatedPreview(session.transcript_text)) {
      setTranscriptText(session.transcript_text);
    }
  }, [session?.id, session?.summary_text, session?.transcript_text]);

  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      const res = await base44.functions.invoke("generateMeetingDocx", { sessionId });
      const { base64, filename } = res.data;
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e.message);
    }
    setExportingDocx(false);
  };

  const handleTitleEdit = () => {
    setTitleDraft(session.title);
    setEditingTitle(true);
  };

  const titleMutation = useMutation({
    mutationFn: async (newTitle) => {
      return await base44.entities.Session.update(sessionId, { title: newTitle.trim() });
    },
    onSuccess: () => {
      setEditingTitle(false);
      setTitleDraft("");
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
  });

  const handleTitleSave = async () => {
    if (!titleDraft.trim()) return;
    titleMutation.mutate(titleDraft.trim());
  };

  const handleTitleCancel = () => {
    setEditingTitle(false);
    setTitleDraft("");
  };

  const handleLanguageChange = async (langCode) => {
    setSelectedLang(langCode);
    if (langCode === "en") {
      setTranslatedSummary(null);
      setTranslatedTranscript(null);
      return;
    }
    const rawSummary = summaryText !== null ? summaryText : session?.summary_text;
    const rawTranscript = transcriptText !== null ? transcriptText : session?.transcript_text;
    if (!rawSummary && !rawTranscript) return;
    setTranslating(true);
    try {
      const langLabels = {
        ar: "Arabic", fr: "French", es: "Spanish", de: "German", zh: "Chinese (Simplified)",
        ja: "Japanese", ko: "Korean", pt: "Portuguese", ru: "Russian", it: "Italian",
        nl: "Dutch", tr: "Turkish", hi: "Hindi", id: "Indonesian", pl: "Polish",
        sv: "Swedish", fa: "Persian", ur: "Urdu", th: "Thai"
      };
      const targetLang = langLabels[langCode] || langCode;
      const [summaryRes, transcriptRes] = await Promise.all([
        rawSummary
          ? base44.integrations.Core.InvokeLLM({
              prompt: `Translate the following text to ${targetLang}. Preserve all formatting, bullet points, JSON structure, timestamps, and speaker labels exactly. Only translate the human-readable text content.\n\n${rawSummary}`
            })
          : Promise.resolve(null),
        rawTranscript
          ? base44.integrations.Core.InvokeLLM({
              prompt: `Translate the following meeting transcript to ${targetLang}. Preserve all timestamps like [00:00], speaker labels, and formatting exactly. Only translate the spoken text.\n\n${rawTranscript}`
            })
          : Promise.resolve(null),
      ]);
      setTranslatedSummary(summaryRes);
      setTranslatedTranscript(transcriptRes);
    } catch (e) {
      console.error("Translation failed", e);
    }
    setTranslating(false);
  };

  const handleTranscriptSave = async (newText) => {
    await base44.entities.Session.update(sessionId, { transcript_text: newText });
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this session? This cannot be undone.")) return;
    setDeleting(true);
    await base44.entities.Session.delete(sessionId);
    navigate("/home");
  };

  const handleRetranscribe = async () => {
    if (!window.confirm("Re-transcribe this session? This will overwrite the current transcript.")) return;
    setIsRetranscribing(true);
    try {
      if (session.video_url) {
        await base44.functions.invoke("processVideoUrl", { video_url: session.video_url });
      } else if (session.audio_file_url) {
        const langCode = session.transcript_language || "en";
        await base44.functions.invoke("transcribeAudio", {
          audio_url: session.audio_file_url,
          language: langCode,
          session_id: sessionId,
        });
      } else {
        alert("No audio or video file to retranscribe");
        setIsRetranscribing(false);
        return;
      }

      await base44.functions.invoke("processSessionBackground", { session_id: sessionId, force_transcribe: true });
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      setTranscriptText(null);
    } catch (e) {
      alert("Retranscription failed: " + e.message);
    }
    setIsRetranscribing(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const totalSec = Math.floor(seconds);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/8" : "border-gray-200";

  if (isLoading || !user) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-white/20" : "text-gray-300"}`} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`mb-4 ${isDark ? "text-white/40" : "text-gray-400"}`}>Session not found</p>
          <Button variant="ghost" onClick={() => navigate("/home")} className={isDark ? "text-white/60" : "text-gray-500"}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  // For multi-part sessions, sum subsession durations as the authoritative total
  const totalDuration = hasSubsessions && subsessions?.length > 0
    ? subsessions.reduce((sum, s) => sum + (s.duration || 0), 0) || session.duration
    : session.duration;

  const currentSummary = translatedSummary !== null ? translatedSummary : (summaryText !== null ? summaryText : session.summary_text);
  const currentTranscript = translatedTranscript !== null ? translatedTranscript : (transcriptText !== null ? transcriptText : session.transcript_text);

  // Show processing banner for any active pipeline status
  const isActivelyProcessing = ACTIVE_STATUSES.has(session.processing_status);

  return (
    <PlaybackProvider>
      <motion.div
        className={`min-h-screen ${bg} ${textMain}`}
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -30, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="max-w-2xl mx-auto px-5 py-8">
          <div className="flex flex-col gap-3 mb-8">
            {/* Row 1: Back + actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate("/home")}
                className={`flex items-center gap-2 text-sm transition-colors ${isDark ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-900"}`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearch((v) => !v)}
                  disabled={!currentTranscript}
                  className={`h-8 w-8 ${showSearch ? "text-blue-400 bg-blue-500/15" : isDark ? "text-white/40 hover:text-blue-400" : "text-gray-400 hover:text-blue-500"}`}
                  title="Search Transcript"
                >
                  <Search className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => navigate(`/WordAnalysis?id=${sessionId}`)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors bg-purple-500/15 hover:bg-purple-500/25"
                  title="AI Word & Sentiment Analysis"
                >
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                </button>
                <div className={`h-6 w-px ${isDark ? "bg-white/10" : "bg-gray-300"}`} />
                <div className="relative group">
                  <Button variant="ghost" size="icon" className={`h-8 w-8 ${isDark ? "text-white/40 hover:text-white/70" : "text-gray-400 hover:text-gray-600"}`}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                  <div className={`absolute right-0 mt-1 w-40 rounded-lg border ${border} ${card} shadow-lg hidden group-hover:block z-50`}>
                    <button
                      onClick={() => setShowFollowUp(true)}
                      disabled={!currentSummary}
                      className={`w-full text-left px-3 py-2 text-xs rounded-t-lg flex items-center gap-2 transition-colors ${
                        !currentSummary
                          ? isDark ? "text-white/20 cursor-not-allowed" : "text-gray-300 cursor-not-allowed"
                          : isDark ? "hover:bg-white/5 text-white/70" : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" /> Send Follow-up
                    </button>
                    <button
                      onClick={() => navigate(`/ExportStudio?sessionId=${sessionId}`)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${isDark ? "hover:bg-white/5 text-white/70" : "hover:bg-gray-100 text-gray-700"}`}
                    >
                      <FileDown className="w-3.5 h-3.5" /> Export Studio
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-400">Beta</span>
                    </button>
                    <button
                      onClick={handleExportDocx}
                      disabled={exportingDocx}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                        exportingDocx
                          ? isDark ? "text-white/20 cursor-not-allowed" : "text-gray-300 cursor-not-allowed"
                          : isDark ? "hover:bg-white/5 text-white/70" : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {exportingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Export DOCX
                    </button>
                    {session.audio_file_url && (
                      <a
                        href={session.audio_file_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${isDark ? "hover:bg-white/5 text-white/70" : "hover:bg-gray-100 text-gray-700"}`}
                      >
                        <Download className="w-3.5 h-3.5" /> Download Audio
                      </a>
                    )}
                    <button
                      onClick={() => setShowShareLink(true)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${isDark ? "hover:bg-white/5 text-white/70" : "hover:bg-gray-100 text-gray-700"}`}
                    >
                      <Users className="w-3.5 h-3.5" /> Share Public Link
                    </button>
                    <button
                      onClick={handleRetranscribe}
                      disabled={isRetranscribing || (!session.audio_file_url && !session.video_url)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                        isRetranscribing || (!session.audio_file_url && !session.video_url)
                          ? isDark ? "text-white/20 cursor-not-allowed" : "text-gray-300 cursor-not-allowed"
                          : isDark ? "hover:bg-white/5 text-white/70" : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {isRetranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Re-transcribe
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className={`w-full text-left px-3 py-2 text-xs rounded-b-lg flex items-center gap-2 transition-colors ${
                        deleting
                          ? isDark ? "text-white/20 cursor-not-allowed" : "text-gray-300 cursor-not-allowed"
                          : isDark ? "hover:bg-red-500/10 text-red-400/70" : "hover:bg-red-50 text-red-600"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Language selector */}
            <div>
              <LanguageSelector value={selectedLang} onChange={handleLanguageChange} loading={translating} />
            </div>
          </div>

          {/* Title & Meta */}
          <div className="mb-8">
            {editingTitle ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") handleTitleCancel();
                  }}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-purple-500/60 border ${
                    isDark
                      ? "bg-white/10 border-white/15 text-white placeholder-white/30"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                />
                <button onClick={handleTitleSave} disabled={titleMutation.isPending} className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 hover:bg-purple-500/30 transition-colors">
                  {titleMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={handleTitleCancel} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? "bg-white/8 text-white/40 hover:bg-white/12" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2 group">
                <h1 className="text-xl font-bold">{session.title}</h1>
                <button onClick={handleTitleEdit} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? "bg-white/8 text-white/40 hover:text-white/70" : "bg-gray-100 text-gray-400 hover:text-gray-700"}`}>
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className={`flex items-center gap-4 mb-4 text-xs ${isDark ? "text-white/30" : "text-gray-400"} flex-wrap`}>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {format(new Date(session.created_date), "MMMM d, yyyy")}
              </span>
              {(() => {
                const start = new Date(session.created_date.endsWith('Z') ? session.created_date : session.created_date + 'Z');
                if (isNaN(start.getTime())) return null;
                const startStr = format(start, "h:mm a");
                if (totalDuration) {
                  const end = new Date(start.getTime() + totalDuration * 1000);
                  return (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {startStr} – {format(end, "h:mm a")}
                    </span>
                  );
                }
                return (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {startStr}
                  </span>
                );
              })()}
              <span className={`text-[11px] ${isDark ? "text-white/25" : "text-gray-400"}`}>
                {formatDuration(totalDuration)}
              </span>
              {totalDuration && isFinite(totalDuration) && (
                <span className="ml-auto px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-400 dark:bg-purple-500/20 dark:text-purple-300 font-semibold text-[10px] whitespace-nowrap">
                  {Math.ceil(totalDuration / 60)}m deducted
                </span>
              )}
            </div>
            {session.session_type && SESSION_TYPES[session.session_type] && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold border mb-3 ${SESSION_TYPES[session.session_type].bg} ${SESSION_TYPES[session.session_type].text} ${SESSION_TYPES[session.session_type].border}`}>
                {SESSION_TYPES[session.session_type].icon} {session.session_type}
              </span>
            )}
            <TagPills tags={session.tags} />
          </div>

          {/* Video Player */}
          {session.video_url && <VideoPlayer videoUrl={session.video_url} />}

          {/* Audio Player */}
          <div className="mb-8">
            {hasSubsessions ? (
              <SubSessionAudioPlayers sessionId={sessionId} subsessions={subsessions} />
            ) : session.audio_file_url ? (
              <SingleSessionAudioPlayer
                session={session}
                sessionId={sessionId}
                onTranscriptUpdated={() => queryClient.invalidateQueries({ queryKey: ["session", sessionId] })}
              />
            ) : (
              <AudioUploader
                sessionId={sessionId}
                onAudioUploaded={() => queryClient.invalidateQueries({ queryKey: ["session", sessionId] })}
                onTranscriptReady={(t) => {
                  setTranscriptText(t);
                  queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
                }}
                onAnalysisStarted={() => queryClient.invalidateQueries({ queryKey: ["session", sessionId] })}
              />
            )}
          </div>

          {/* Processing Banner — shown for any active pipeline status */}
          {isActivelyProcessing && (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-300">Processing in the background…</p>
                <p className={`text-xs mt-0.5 ${isDark ? "text-white/40" : "text-gray-400"}`}>
                  AI is transcribing and analyzing your session. This page will update automatically.
                </p>
              </div>
            </div>
          )}

          {/* Sentiment Timeline */}
          {showSentiment && (
            <div className="mb-8 space-y-4">
              <SentimentTimeline transcript={currentTranscript} onClose={() => setShowSentiment(false)} />
              {currentTranscript && (
                <MeetingFrictionAnalysis transcript={currentTranscript} onClose={() => setShowSentiment(false)} />
              )}
            </div>
          )}

          {/* Natural Language Search */}
          {showSearch && currentTranscript && (
            <div className="mb-8">
              <NaturalLanguageSearch transcript={currentTranscript} onClose={() => setShowSearch(false)} />
            </div>
          )}

          {/* Speaker Timeline */}
          {currentTranscript && session.speaker_mapping && (
            <div className="mb-8">
              <SpeakerTimeline transcript={currentTranscript} speaker_mapping={session.speaker_mapping} duration={session.duration} />
            </div>
          )}

          {/* My Notes */}
          <ManualNotes
            notes={manualNotes !== null ? manualNotes : session.manual_notes}
            sessionId={sessionId}
            onNotesUpdated={setManualNotes}
          />

          {/* Summary */}
          <div className="mb-8">
            <SummarySection
              session={session}
              sessionId={sessionId}
              summary={currentSummary}
              transcript={currentTranscript}
              subsessions={hasSubsessions ? subsessions : null}
              audioUrl={session.audio_file_url}
              onSummaryGenerated={setSummaryText}
              onTranscriptGenerated={setTranscriptText}
              manualNotes={manualNotes !== null ? manualNotes : session.manual_notes}
            />
          </div>

          {/* Ad */}
          {currentSummary && (
            <div className="mb-8">
              <GoogleAd format="auto" subscription={subscription} />
            </div>
          )}

          {/* Action Items */}
          {currentSummary && (
            <div className="mb-8">
              <ActionItems
                sessionId={sessionId}
                summaryText={currentSummary}
                transcript={currentTranscript}
                sessionTitle={session.title}
                onSummaryUpdated={setSummaryText}
              />
            </div>
          )}

          {/* Draft Generator */}
          {(currentSummary || currentTranscript) && (
            <div className="mb-8">
              <DraftGenerator summary={currentSummary} transcript={currentTranscript} />
            </div>
          )}

          {/* Educational Tools */}
          {["Class", "Lecture", "Workshop"].includes(session.session_type) && (currentTranscript || currentSummary) && (
            <EducationalToolsPanel
              session={session}
              transcript={currentTranscript}
              summary={currentSummary}
              onFlashcardsGenerated={setFlashcards}
              onQuizGenerated={(quizItems, onScore) => {
                setQuiz({ items: quizItems, onScore });
              }}
            />
          )}

          {/* Flashcards */}
          {flashcards && (
            <div className="mb-8">
              <FlashcardDisplay
                flashcards={flashcards}
                title={session.title}
                onDeckComplete={async ({ known }) => {
                  try {
                    const u = await base44.auth.me();
                    const { format, addDays } = await import("date-fns");
                    const score = Math.round((known.length / flashcards.length) * 100);
                    const intervalDays = score >= 80 ? 14 : score >= 60 ? 7 : 1;
                    await base44.entities.StudyRecord.create({
                      user_email: u.email,
                      session_id: session.id,
                      session_title: session.title,
                      session_type: session.session_type,
                      activity_type: "flashcards",
                      score,
                      total_items: flashcards.length,
                      study_date: format(new Date(), "yyyy-MM-dd"),
                      next_review_date: format(addDays(new Date(), intervalDays), "yyyy-MM-dd"),
                      review_interval_days: intervalDays,
                      tags: session.tags || [],
                    });
                  } catch (e) {
                    console.warn("Failed to save deck study record", e);
                  }
                }}
              />
            </div>
          )}

          {/* Quiz */}
          {quiz && (
            <div className="mb-8">
              <QuizDisplay quiz={quiz.items || quiz} onClose={() => setQuiz(null)} onScoreSubmitted={quiz.onScore} />
            </div>
          )}

          {/* Structured Notes */}
          {structuredContent && (
            <div className="mb-8">
              <StructuredNotes content={structuredContent} />
            </div>
          )}

          {/* Ad */}
          <div className="mb-8">
            <GoogleAd format="auto" subscription={subscription} />
          </div>

          {/* Calendar Event Link */}
          <div className="mb-8">
            <CalendarEventLink
              session={session}
              sessionId={sessionId}
              onUpdated={() => queryClient.invalidateQueries({ queryKey: ["session", sessionId] })}
            />
          </div>

          {/* Transcript Editor */}
          <div className="mb-8">
            <TranscriptEditor
              transcript={currentTranscript}
              subsessions={hasSubsessions ? subsessions : null}
              originalTranscript={session.original_transcript_text}
              isMultilingual={session.is_multilingual}
              sessionTitle={session.title}
              sessionCreatedDate={session.created_date}
              onSave={handleTranscriptSave}
              onSyncHighlights={async (bullets) => {
                const existing = summaryText !== null ? summaryText : session.summary_text;
                let updated;
                try {
                  const parsed = typeof existing === "string" ? JSON.parse(existing) : existing;
                  if (parsed && typeof parsed === "object") {
                    const extra = String(bullets || "")
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    parsed.ai_insights = [...(parsed.ai_insights || []), ...extra];
                    updated = JSON.stringify(parsed);
                  } else {
                    updated = existing ? `${existing}\n\n${bullets}` : bullets;
                  }
                } catch {
                  updated = existing ? `${existing}\n\n${bullets}` : bullets;
                }

                setSummaryText(updated);
                await base44.entities.Session.update(sessionId, { summary_text: updated });
              }}
            />
          </div>
        </div>

        {showShare && <ShareSessionModal session={session} onClose={() => setShowShare(false)} />}
        {showShareLink && <ShareLinkModal session={session} onClose={() => setShowShareLink(false)} />}
        {showFollowUp && <FollowUpEmailDrafter session={session} onClose={() => setShowFollowUp(false)} />}
        {showPreview && <PreviewModal sessionId={sessionId} onClose={() => setShowPreview(false)} />}
        <AskSilo
          session={session}
          transcript={currentTranscript}
          summary={currentSummary}
          onFlashcardsGenerated={setFlashcards}
          onStructuredContentGenerated={setStructuredContent}
        />
      </motion.div>
    </PlaybackProvider>
  );
}