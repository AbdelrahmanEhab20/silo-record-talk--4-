import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Square, X, Play, Pause, Loader2, ArrowLeft, ChevronDown, Plus, Star } from "lucide-react";
import ProcessingBanner from "@/components/session/ProcessingBanner";
import MicSettings from "@/components/recording/MicSettings";
import RecordingIndicator from "@/components/recording/RecordingIndicator";
import SubSessionList from "@/components/recording/SubSessionList";
import AnimatedWaveform from "@/components/recording/AnimatedWaveform";
import SignalQualityIndicator from "@/components/audio/SignalQualityIndicator";
import { detectPlatform, getSupportLevel, AUDIO_MODES, getRecommendedMode, isModeSupported, getModeDescription } from "@/lib/audioCapabilities";
import { AudioAnalyzer } from "@/lib/audioAnalyzer";
import { useTheme } from "@/lib/ThemeContext";
import { ChunkProcessor } from "@/lib/chunkProcessor";
import AudioModeCard from "@/components/audio/AudioModeCard";
import DeviceSetupAssistant from "@/components/audio/DeviceSetupAssistant";
import TranscriptPreview from "@/components/audio/TranscriptPreview";
import UnsupportedFallback from "@/components/audio/UnsupportedFallback";
import SiloAgent from "@/components/recording/SiloAgent";
import MinutesStatusBar from "@/components/recording/MinutesStatusBar";
import QuickNotes from "@/components/recording/QuickNotes";
import LanguageSelector from "@/components/session/LanguageSelector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import SessionContextPanel from "@/components/recording/SessionContextPanel";
import TranscriptionSources from "@/components/recording/TranscriptionSources";
import LiveTranscriptBox from "@/components/recording/LiveTranscriptBox";

const CHUNK_INTERVAL_MS = 15000;
const MIN_CHUNK_BYTES = 8000;

// Serialize QuickNotes objects to strings for storage in manual_notes
const serializeNotes = (notes) =>
  (notes || []).map(n =>
    typeof n === 'object' ? `[${n.timestamp}] ${n.text}` : String(n)
  ).filter(Boolean);

// ───── Transcript truncation helpers ─────
const MAX_DB_TRANSCRIPT_CHARS = 3500;

const isLikelyTooLargeTranscript = (text) => {
  if (!text) return false;
  return text.length > MAX_DB_TRANSCRIPT_CHARS;
};

const buildTranscriptPreview = (text, limit = MAX_DB_TRANSCRIPT_CHARS) => {
  const safe = (text || "").trim();
  if (!safe) return "";
  if (safe.length <= limit) return safe;
  return `${safe.slice(0, limit)}\n...[truncated, see transcript_file_url]`;
};
const uploadTranscriptFile = async (transcriptText) => {
  if (!transcriptText || transcriptText.length < 5000) return null;
  try {
    const result = await appClient.functions.invoke('uploadTranscriptFile', { transcript_text: transcriptText });
    return result.data?.file_url || null;
  } catch (e) {
    console.warn('Failed to upload transcript file:', e);
    return null;
  }
};
const buildTranscriptPayloadForSessionCreate = async (fullText) => {
  const text = (fullText || "").trim();
  if (!text) return { transcript_text: "" };

  if (!isLikelyTooLargeTranscript(text)) {
    return { transcript_text: text };
  }

  const transcriptFileUrl = await uploadTranscriptFile(text);
  if (transcriptFileUrl) {
    return {
      transcript_text: buildTranscriptPreview(text),
      transcript_file_url: transcriptFileUrl,
    };
  }

  // fallback if upload failed
  return {
    transcript_text: buildTranscriptPreview(text, 2000).replace(
      "see transcript_file_url",
      "upload failed; transcript truncated"
    ),
  };
};

export default function Recording() {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Capture flow state
  const [captureFlow, setCaptureFlow] = useState('start');
  const [selectedMode, setSelectedMode] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [support, setSupport] = useState(null);
  const [soundLevel, setSoundLevel] = useState(0);
  const [waveformBars, setWaveformBars] = useState(Array(24).fill(0));
  const soundLevelRef = useRef(0);
  const audioAnalyzerRef = useRef(null);
  const analysisIntervalRef = useRef(null);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState([]);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadStage, setUploadStage] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [audioSourceOpen, setAudioSourceOpen] = useState(true);
  const [quickNotes, setQuickNotes] = useState([]);
  const quickNotesRef = useRef([]);
  const [chunkInsights, setChunkInsights] = useState([]);
  const [isImportant, setIsImportant] = useState(false);
  const [sessionContext, setSessionContext] = useState({});

  // Sub-session state
  const [subsessions, setSubsessions] = useState([]);
  const subsessionsRef = useRef([]);
  const [isSubsessionMode, setIsSubsessionMode] = useState(false);
  const mainSessionIdRef = useRef(null);
  const subsessionCounterRef = useRef(0);
  const stopInProgressRef = useRef(false);

  // Auto-save
  const autoSaveSessionIdRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const autoSaveInProgressRef = useRef(false);
  const performAutoSaveRef = useRef(null);

  // Reuse screen stream across sub-sessions
  const sharedDisplayStreamRef = useRef(null);

  // Internal refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const pendingChunksRef = useRef([]);
  const firstChunkRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const chunkTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const interimIndexRef = useRef(null);
  const whisperModeRef = useRef(false);
  const mimeTypeRef = useRef("audio/webm");

  const chunkProcessorRef = useRef(null);
  const segmentsRef = useRef(segments);
  const durationRef = useRef(duration);
  const wakeLockRef = useRef(null);
  const processingTriggeredRef = useRef(new Set());

  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { subsessionsRef.current = subsessions; }, [subsessions]);

  useEffect(() => {
    if (!chunkProcessorRef.current) {
      chunkProcessorRef.current = new ChunkProcessor((insights) => {
        setChunkInsights((prev) => [...prev, insights]);
      });
    }
  }, []);

  const detectedPlatform = useMemo(() => detectPlatform(), []);
  const detectedSupport = useMemo(() => getSupportLevel(detectedPlatform), [detectedPlatform]);

  useEffect(() => {
    setPlatform(detectedPlatform);
    setSupport(detectedSupport);
    setSelectedMode(getRecommendedMode(detectedPlatform));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(chunkTimerRef.current);
      clearInterval(analysisIntervalRef.current);
      clearInterval(autoSaveTimerRef.current);
      if (window.__recordingWatchdogs) {
        window.__recordingWatchdogs.forEach(wd => clearInterval(wd));
        window.__recordingWatchdogs = [];
      }
      if (recognitionRef.current) recognitionRef.current.abort();
      if (audioAnalyzerRef.current) audioAnalyzerRef.current.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
      if (sharedDisplayStreamRef.current) {
        sharedDisplayStreamRef.current.getTracks().forEach(t => t.stop());
        sharedDisplayStreamRef.current = null;
      }
    };
  }, []);

  const handleAddNote = (note) => setQuickNotes((prev) => {
    const updated = [...prev, note];
    quickNotesRef.current = updated;
    return updated;
  });

  const formatTimestamp = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const sendPendingChunks = useCallback(async () => {
    if (pendingChunksRef.current.length === 0) return;
    const chunks = [...pendingChunksRef.current];
    pendingChunksRef.current = [];
    const mimeType = mimeTypeRef.current;
    const isWebm = mimeType.includes('webm');
    const firstChunk = firstChunkRef.current;
    const needsHeader = isWebm && firstChunk && !chunks.includes(firstChunk);
    const blobChunks = needsHeader ? [firstChunk, ...chunks] : chunks;
    const blob = new Blob(blobChunks, { type: mimeType });
    if (blob.size < MIN_CHUNK_BYTES) return;
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    const base64 = btoa(binary);
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000) - pausedTimeRef.current;
    const ts = formatTimestamp(Math.max(0, elapsed - Math.round(chunks.length / 2)));
    try {
      console.log("transcribeChunk is temporarily disabled");
    } catch (e) {
      console.warn("Whisper chunk error:", e.message || e);
    }
  }, []);

  const performAutoSave = useCallback(async () => {
    if (autoSaveInProgressRef.current) return;
    if (isSubsessionMode) return;
    const currentSegments = segmentsRef.current;
    const currentDuration = durationRef.current;
    if (currentDuration < 5 || currentSegments.length === 0) return;

    autoSaveInProgressRef.current = true;
    try {
      const rawTranscript = currentSegments.map((seg) => `[${seg.timestamp}] ${seg.text}`).join("\n");
      const user = await appClient.auth.me();

      if (!autoSaveSessionIdRef.current) {
        const now = new Date();
        const title = `Session — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
        const session = await appClient.entities.Session.create({
          user_email: user.email,
          title,
          duration: currentDuration,
          transcript_text: rawTranscript,
          processing_status: 'processing',
          manual_notes: serializeNotes(quickNotesRef.current),
          source: 'recording',
          ...sessionContext,
        });
        autoSaveSessionIdRef.current = session.id;
      } else {
        await appClient.entities.Session.update(autoSaveSessionIdRef.current, {
          duration: currentDuration,
          transcript_text: rawTranscript,
          manual_notes: serializeNotes(quickNotesRef.current),
        });
      }
    } catch (e) {
      console.warn('Auto-save failed (non-critical):', e);
    } finally {
      autoSaveInProgressRef.current = false;
    }
  }, [sessionContext, isSubsessionMode]);

  useEffect(() => {
    performAutoSaveRef.current = performAutoSave;
  }, [performAutoSave]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (performAutoSaveRef.current) performAutoSaveRef.current();
      } else if (document.visibilityState === 'visible') {
        const isRecording = mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive';
        if (isRecording) {
          if (whisperModeRef.current) {
            clearInterval(chunkTimerRef.current);
            chunkTimerRef.current = setInterval(sendPendingChunks, CHUNK_INTERVAL_MS);
          } else if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) {}
          }
          if (audioAnalyzerRef.current) {
            clearInterval(analysisIntervalRef.current);
            analysisIntervalRef.current = setInterval(() => {
              if (audioAnalyzerRef.current) {
                const level = audioAnalyzerRef.current.getSoundLevel();
                setSoundLevel(level);
                soundLevelRef.current = level;
                setWaveformBars(audioAnalyzerRef.current.getWaveformBars(24));
              }
            }, 50);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [performAutoSave]);

  const acquireStream = async (mode) => {
    if (mode === AUDIO_MODES.INTERNAL || mode === AUDIO_MODES.SCREEN_AUDIO) {
      if (sharedDisplayStreamRef.current) {
        const tracks = sharedDisplayStreamRef.current.getTracks();
        const allActive = tracks.length > 0 && tracks.every(t => t.readyState === 'live');
        if (allActive) return sharedDisplayStreamRef.current;
        sharedDisplayStreamRef.current = null;
      }
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      displayStream.getVideoTracks().forEach(t => t.stop());
      sharedDisplayStreamRef.current = displayStream;
      return displayStream;
    }

    if (mode === AUDIO_MODES.INTERNAL_MIC) {
      let displayStream = sharedDisplayStreamRef.current;
      if (!displayStream || displayStream.getTracks().some(t => t.readyState !== 'live')) {
        displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        displayStream.getVideoTracks().forEach(t => t.stop());
        sharedDisplayStreamRef.current = displayStream;
      }
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId
          ? { deviceId: { ideal: selectedDeviceId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true }
      });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const dest = audioContext.createMediaStreamDestination();
      audioContext.createMediaStreamSource(displayStream).connect(dest);
      audioContext.createMediaStreamSource(micStream).connect(dest);
      return dest.stream;
    }

    const isIOS = detectedPlatform === 'ios';
    if (isIOS) {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    const constraints = selectedDeviceId
      ? { audio: { deviceId: { exact: selectedDeviceId }, echoCancellation: true, noiseSuppression: true } }
      : { audio: { echoCancellation: true, noiseSuppression: true } };
    return await navigator.mediaDevices.getUserMedia(constraints);
  };

  const saveSessionInBackground = async ({ audioChunks, snapshotSegments, snapshotDuration, parentSessionId, isSubsession, localId }) => {
    const mimeType = mimeTypeRef.current;
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const isWebm = mimeType.includes('webm');
    const firstChunk = firstChunkRef.current;
    const needsHeader = isWebm && firstChunk && audioChunks.length > 0 && !audioChunks.includes(firstChunk);
    const blobChunks = needsHeader ? [firstChunk, ...audioChunks] : audioChunks;
    const audioBlob = new Blob(blobChunks, { type: mimeType });
    const audioFile = new File([audioBlob], `session.${ext}`, { type: mimeType });
    const now = new Date();
    const title = `Session — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    const rawTranscript = snapshotSegments.map((seg) => `[${seg.timestamp}] ${seg.text}`).join("\n");

    const user = await appClient.auth.me();
    
    // REMOVED: Premature deduction call (Patch 2)
    // const durationMins = Math.ceil(snapshotDuration / 60);
    // if (durationMins > 0) {
    //   appClient.functions.invoke('deductMinutes', { minutes: durationMins }).catch(() => {});
    // }

    appClient.analytics.track({ eventName: "recording_ended", properties: { duration_seconds: snapshotDuration, has_transcript: !!rawTranscript } });

    const { file_url: audioUrl } = await appClient.integrations.Core.UploadFile({ file: audioFile });

    const session = await appClient.entities.Session.create({
      user_email: user.email,
      title,
      duration: snapshotDuration,
      audio_file_url: audioUrl,
      transcript_text: rawTranscript,
      processing_status: 'pending',
      manual_notes: serializeNotes(quickNotesRef.current),
      source: 'recording',
      billing_source: 'recording', // Patch 3: Add billing metadata
      billable_minutes_estimate: Math.max(1, Math.ceil(snapshotDuration / 60)), // Patch 3: Estimated billable minutes
      ...(isSubsession ? { is_subsession: true, parent_session_id: parentSessionId } : {}),
    });

    if (!processingTriggeredRef.current.has(session.id)) {
      processingTriggeredRef.current.add(session.id);
      appClient.functions.invoke('processSessionBackground', { session_id: session.id, force_transcribe: true }).catch(() => {});
    }

    return session;
  };



  const finalizeMergedSession = async (lastAudioChunks, lastSegments, lastDuration) => {
    setSaving(true);
    clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;
    const capturedAutoSaveId = autoSaveSessionIdRef.current;
    try {
      const user = await appClient.auth.me();
      const now = new Date();
      const title = `Session — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

      const allSubsessions = subsessionsRef.current;

      if (allSubsessions.length > 0) {
        const mimeType = mimeTypeRef.current;
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const isWebmLast = mimeType.includes('webm');
        const firstChunkLast = firstChunkRef.current;
        const needsHeaderLast = isWebmLast && firstChunkLast && lastAudioChunks.length > 0 && !lastAudioChunks.includes(firstChunkLast);
        const audioBlob = new Blob(needsHeaderLast ? [firstChunkLast, ...lastAudioChunks] : lastAudioChunks, { type: mimeType });
        const audioFile = new File([audioBlob], `session.${ext}`, { type: mimeType });
        const rawLastTranscript = lastSegments.map(s => `[${s.timestamp}] ${s.text}`).join("\n");
        const { file_url: lastAudioUrl } = await appClient.integrations.Core.UploadFile({ file: audioFile });

        const lastTranscriptFileUrl = await uploadTranscriptFile(rawLastTranscript);

        const lastSub = await appClient.entities.Session.create({
          user_email: user.email,
          title: `${title} (Part ${allSubsessions.length + 1})`,
          duration: lastDuration,
          audio_file_url: lastAudioUrl,
          transcript_text: rawLastTranscript,
          transcript_file_url: lastTranscriptFileUrl || undefined,
          processing_status: 'pending',
          is_subsession: true,
          parent_session_id: mainSessionIdRef.current,
          manual_notes: serializeNotes(quickNotesRef.current),
          source: 'recording',
          billing_source: 'recording', // Patch 3: Add billing metadata for sub-sessions too
          billable_minutes_estimate: Math.max(1, Math.ceil(lastDuration / 60)),
        });

        setUploadStage('processing_last');
        let processedLastTranscript = rawLastTranscript;
        try {
          await appClient.functions.invoke('processSessionBackground', { session_id: lastSub.id, force_transcribe: true });
          const deadline = Date.now() + 60000;
          while (Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 3000));
            const updated = await appClient.entities.Session.get(lastSub.id);
            if (updated.processing_status === 'done' || updated.processing_status === 'failed') {
              if (updated.transcript_file_url) {
                try {
                  const fileRes = await fetch(updated.transcript_file_url);
                  if (fileRes.ok) processedLastTranscript = await fileRes.text();
                } catch {}
              } else if (updated.transcript_text) {
                processedLastTranscript = updated.transcript_text;
              }
              break;
            }
          }
        } catch (e) {
          console.warn('Last sub-session processing failed, using live transcript:', e);
        }
        setUploadStage(null);

        const seenSessionIds = new Set();
        const uniqueSubsessions = allSubsessions.filter(s => {
          if (!s.sessionId) return true;
          if (seenSessionIds.has(s.sessionId)) return false;
          seenSessionIds.add(s.sessionId);
          return true;
        });

        const fetchedSubTranscripts = await Promise.all(
          uniqueSubsessions.map(async (s) => {
            if (s.sessionId) {
              try {
                const dbSub = await appClient.entities.Session.get(s.sessionId);
                if (dbSub.transcript_file_url) {
                  try {
                    const fileRes = await fetch(dbSub.transcript_file_url);
                    if (fileRes.ok) {
                      const text = await fileRes.text();
                      return text.replace(/^\[Part \d+\]\n/, '').trim();
                    }
                  } catch {}
                }
                const text = dbSub.transcript_text || s.transcript || '';
                return text.replace(/^\[Part \d+\]\n/, '').trim();
              } catch {}
            }
            return (s.transcript || '').trim();
          })
        );

        const transcriptParts = [
          ...fetchedSubTranscripts.map((t, i) => t ? `[Part ${i + 1}]\n${t}` : null),
          processedLastTranscript.trim() ? `[Part ${uniqueSubsessions.length + 1}]\n${processedLastTranscript.trim()}` : null,
        ].filter(Boolean);

        const allTranscripts = transcriptParts.join("\n\n");
        const totalDuration = uniqueSubsessions.reduce((sum, s) => sum + (s.duration || 0), 0) + lastDuration;
        const mergedTranscriptFileUrl = await uploadTranscriptFile(allTranscripts);

        await appClient.entities.Session.update(mainSessionIdRef.current, {
          transcript_text: allTranscripts.slice(0, 10000),
          transcript_file_url: mergedTranscriptFileUrl || undefined,
          duration: totalDuration,
          processing_status: 'pending',
          manual_notes: serializeNotes(quickNotesRef.current),
          ...sessionContext,
        });

        appClient.functions.invoke('processSessionBackground', { session_id: mainSessionIdRef.current, force_transcribe: true }).catch(() => {});
        setSaving(false);
        navigate(`/SessionDetail?id=${mainSessionIdRef.current}`);
      } else {
        // REMOVED: Premature deduction call (Patch 2)
        // const durationMins = Math.ceil(lastDuration / 60);
        // if (durationMins > 0) appClient.functions.invoke('deductMinutes', { minutes: durationMins }).catch(() => {});

        const mimeType = mimeTypeRef.current;
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const isWebmSingle = mimeType.includes('webm');
        const firstChunkSingle = firstChunkRef.current;
        const needsHeaderSingle = isWebmSingle && firstChunkSingle && lastAudioChunks.length > 0 && !lastAudioChunks.includes(firstChunkSingle);
        const audioBlob = new Blob(needsHeaderSingle ? [firstChunkSingle, ...lastAudioChunks] : lastAudioChunks, { type: mimeType });
        const audioFile = new File([audioBlob], `session.${ext}`, { type: mimeType });
        const rawTranscript = lastSegments.map(s => `[${s.timestamp}] ${s.text}`).join("\n");
        const { file_url: audioUrl } = await appClient.integrations.Core.UploadFile({ file: audioFile });

        const transcriptFileUrl = await uploadTranscriptFile(rawTranscript);

        let sessionId = capturedAutoSaveId;
        if (sessionId) {
          autoSaveSessionIdRef.current = null;
          await appClient.entities.Session.update(sessionId, {
            title,
            duration: lastDuration,
            audio_file_url: audioUrl,
            transcript_text: rawTranscript.slice(0, 10000),
            transcript_file_url: transcriptFileUrl || undefined,
            processing_status: 'pending',
            manual_notes: serializeNotes(quickNotesRef.current),
            billing_source: 'recording', // Patch 3: Add billing metadata for single session update
            billable_minutes_estimate: Math.max(1, Math.ceil(lastDuration / 60)),
            ...sessionContext,
          });
        } else {
          const session = await appClient.entities.Session.create({
            user_email: user.email,
            title,
            duration: lastDuration,
            audio_file_url: audioUrl,
            transcript_text: rawTranscript.slice(0, 10000),
            transcript_file_url: transcriptFileUrl || undefined,
            processing_status: 'pending',
            manual_notes: serializeNotes(quickNotesRef.current),
            source: 'recording',
            billing_source: 'recording', // Patch 3: Add billing metadata for single session create
            billable_minutes_estimate: Math.max(1, Math.ceil(lastDuration / 60)),
            ...sessionContext,
          });
          sessionId = session.id;
        }

        appClient.functions.invoke('processSessionBackground', { session_id: sessionId, force_transcribe: true }).catch(() => {});
        setSaving(false);
        navigate(`/SessionDetail?id=${sessionId}`);
      }
    } catch (e) {
      console.error('Finalize failed:', e);
      setSaving(false);
      if (autoSaveSessionIdRef.current) {
        navigate(`/SessionDetail?id=${autoSaveSessionIdRef.current}`);
      } else {
        navigate('/home');
      }
    }
  };

  const stopRecording = useCallback(async (opts = {}) => {
    const { startNew = false } = opts;

    if (stopInProgressRef.current) return;
    stopInProgressRef.current = true;

    const snapshotSegments = segmentsRef.current;
    const snapshotDuration = durationRef.current;
    const snapshotMode = selectedMode;

    setRecording(false);
    setPaused(false);
    clearInterval(timerRef.current);
    clearInterval(chunkTimerRef.current);
    clearInterval(analysisIntervalRef.current);
    clearInterval(autoSaveTimerRef.current);

    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
    }

    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onresult = null; rec.onend = null; rec.onerror = null;
      try { rec.abort(); } catch (e) {}
    }
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.stop();
      audioAnalyzerRef.current = null;
    }

    return new Promise((resolve) => {
      const doAfterStop = async (audioChunks) => {
        if (startNew) {
          clearInterval(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
          autoSaveInProgressRef.current = false;
          if (autoSaveSessionIdRef.current) {
            const orphanId = autoSaveSessionIdRef.current;
            autoSaveSessionIdRef.current = null;
            appClient.entities.Session.delete(orphanId).catch(() => {});
          }

          setIsSubsessionMode(true);

          const subIdx = subsessionCounterRef.current;
          subsessionCounterRef.current++;

          const localId = `sub_${subIdx}`;
          const rawTranscript = snapshotSegments.map(s => s.text).join(' ');
          const wordCount = snapshotSegments.reduce((sum, s) => sum + s.text.split(' ').filter(w => w).length, 0);

          let parentId = mainSessionIdRef.current;
          if (!parentId) {
            const user = await appClient.auth.me();
            const now = new Date();
            const placeholderTitle = `Session — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
            const mainSession = await appClient.entities.Session.create({
              user_email: user.email,
              title: placeholderTitle,
              duration: 0,
              processing_status: 'processing',
              is_subsession: false,
              source: 'recording',
              billing_source: 'recording', // Patch 3: Add billing metadata for main session
            });
            mainSessionIdRef.current = mainSession.id;
            parentId = mainSession.id;
          }

          const alreadyExists = subsessionsRef.current.some(s => s.localId === localId);
          if (alreadyExists) {
            stopInProgressRef.current = false;
            resolve();
            return;
          }
          const subEntry = { localId, duration: snapshotDuration, transcript: rawTranscript, wordCount, status: 'uploading' };
          setSubsessions(prev => {
            if (prev.some(s => s.localId === localId)) return prev;
            const updated = [...prev, subEntry];
            subsessionsRef.current = updated;
            return updated;
          });

          setSegments([]);
          setDuration(0);
          audioChunksRef.current = [];
          pendingChunksRef.current = [];
          firstChunkRef.current = null;
          pausedTimeRef.current = 0;
          setWaveformBars(Array(24).fill(0));

          clearInterval(chunkTimerRef.current);
          chunkTimerRef.current = null;
          clearInterval(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
          autoSaveSessionIdRef.current = null;

          setCaptureFlow('recording');
          startRecording(snapshotMode || AUDIO_MODES.MICROPHONE);

          saveSessionInBackground({
            audioChunks,
            snapshotSegments,
            snapshotDuration,
            parentSessionId: parentId,
            isSubsession: true,
            localId,
          }).then((session) => {
            setSubsessions(prev => prev.map(s =>
              s.localId === localId ? { ...s, status: 'processing', sessionId: session.id } : s
            ));
            const poll = setInterval(async () => {
              try {
                const updated = await appClient.entities.Session.get(session.id);
                if (updated.processing_status === 'done' || updated.processing_status === 'failed') {
                  clearInterval(poll);
                  setSubsessions(prev => prev.map(s =>
                    s.localId === localId ? { ...s, status: updated.processing_status, transcript: updated.transcript_text || s.transcript } : s
                  ));
                }
              } catch {}
            }, 4000);
          }).catch(() => {
            setSubsessions(prev => prev.map(s =>
              s.localId === localId ? { ...s, status: 'failed' } : s
            ));
          });

        } else {
          if (sharedDisplayStreamRef.current) {
            sharedDisplayStreamRef.current.getTracks().forEach(t => t.stop());
            sharedDisplayStreamRef.current = null;
          }
          setCaptureFlow('start');
          await finalizeMergedSession(audioChunks, snapshotSegments, snapshotDuration);
        }
        stopInProgressRef.current = false;
        resolve();
      };

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        const recorder = mediaRecorderRef.current;
        recorder.onstop = async () => {
          recorder.onstop = null;
          const audioChunks = [...audioChunksRef.current];
          await doAfterStop(audioChunks);
        };
        const sharedTracks = sharedDisplayStreamRef.current
          ? sharedDisplayStreamRef.current.getTracks()
          : [];
        recorder.stream.getTracks().forEach((t) => {
          if (!sharedTracks.includes(t)) t.stop();
        });
        recorder.stop();
      } else {
        doAfterStop([]);
      }
    });
  }, [navigate, selectedMode, selectedLanguage]);

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      if (mediaRecorderRef.current) mediaRecorderRef.current.resume();
      if (recognitionRef.current) { try { recognitionRef.current.start(); } catch (e) {} }
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      if (audioAnalyzerRef.current) {
        analysisIntervalRef.current = setInterval(() => {
          if (audioAnalyzerRef.current) {
            const level = audioAnalyzerRef.current.getSoundLevel();
            setSoundLevel(level);
            soundLevelRef.current = level;
            setWaveformBars(audioAnalyzerRef.current.getWaveformBars(24));
          }
        }, 50);
      }
    } else {
      setPaused(true);
      clearInterval(timerRef.current);
      clearInterval(analysisIntervalRef.current);
      setSoundLevel(0);
      setWaveformBars(Array(24).fill(0));
      if (mediaRecorderRef.current) mediaRecorderRef.current.pause();
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch (e) {} }
    }
  };

  const startRecording = async (mode = AUDIO_MODES.MICROPHONE) => {
    setError(null);
    setSegments([]);
    setDuration(0);
    audioChunksRef.current = [];
    pendingChunksRef.current = [];
    firstChunkRef.current = null;
    pausedTimeRef.current = 0;
    setWaveformBars(Array(24).fill(0));
    if (!isSubsessionMode) {
      if (autoSaveSessionIdRef.current) {
        appClient.entities.Session.delete(autoSaveSessionIdRef.current).catch(() => {});
      }
      autoSaveSessionIdRef.current = null;
      processingTriggeredRef.current = new Set();
    }

    let stream;
    try {
      stream = await acquireStream(mode);
    } catch (e) {
      console.warn('Audio capture error:', e.name, e.message);
      const isDisplayMode = mode === AUDIO_MODES.INTERNAL || mode === AUDIO_MODES.SCREEN_AUDIO || mode === AUDIO_MODES.INTERNAL_MIC;
      setPermissionDenied(isDisplayMode ? 'display' : 'microphone');
      setCaptureFlow('permission_denied');
      return;
    }

    try {
      audioAnalyzerRef.current = new AudioAnalyzer(stream);
      analysisIntervalRef.current = setInterval(() => {
        if (audioAnalyzerRef.current) {
          const level = audioAnalyzerRef.current.getSoundLevel();
          setSoundLevel(level);
          soundLevelRef.current = level;
          setWaveformBars(audioAnalyzerRef.current.getWaveformBars(24));
        }
      }, 50);
    } catch (e) { console.warn('AudioAnalyzer setup failed:', e); }

    const isIOS = detectedPlatform === 'ios';
    const mimeType = isIOS
      ? (MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm;codecs=opus")
      : "audio/webm;codecs=opus";
    mimeTypeRef.current = mimeType;

    const mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: isIOS ? undefined : 64000 });
    mediaRecorderRef.current = mediaRecorder;
    firstChunkRef.current = null;
    let lastChunkTime = Date.now();
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
        if (firstChunkRef.current === null) {
          firstChunkRef.current = e.data;
        }
        pendingChunksRef.current.push(e.data);
        lastChunkTime = Date.now();
      } else {
        console.warn("Empty chunk received from MediaRecorder");
      }
    };
    mediaRecorder.start(1000);

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

    const useWhisperOnly = mode === AUDIO_MODES.INTERNAL || mode === AUDIO_MODES.SCREEN_AUDIO || mode === AUDIO_MODES.INTERNAL_MIC;
    const SpeechRecognition = !useWhisperOnly ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (SpeechRecognition) {
      whisperModeRef.current = false;
      interimIndexRef.current = null;

      const startRecognition = () => {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage;
        recognitionRef.current = recognition;

        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0].transcript.trim();
            if (!text) continue;
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const ts = formatTimestamp(elapsed);
            if (result.isFinal) {
              setSegments((prev) => {
                const updated = [...prev];
                const idx = interimIndexRef.current;
                if (idx !== null && idx < updated.length) { updated[idx] = { timestamp: ts, text }; }
                else { updated.push({ timestamp: ts, text }); }
                interimIndexRef.current = null;
                return updated;
              });
            } else {
              setSegments((prev) => {
                const updated = [...prev];
                const idx = interimIndexRef.current;
                if (idx !== null && idx < updated.length) { updated[idx] = { timestamp: ts, text }; }
                else { interimIndexRef.current = updated.length; updated.push({ timestamp: ts, text }); }
                return updated;
              });
            }
          }
        };

        recognition.onerror = (e) => {
          console.warn("SpeechRecognition error:", e.error);
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            recognitionRef.current = null;
            whisperModeRef.current = true;
            chunkTimerRef.current = setInterval(sendPendingChunks, CHUNK_INTERVAL_MS);
            return;
          }
          if (recognitionRef.current === recognition) {
            setTimeout(() => { if (recognitionRef.current === recognition) startRecognition(); }, 800);
          }
        };
        recognition.onend = () => {
          if (recognitionRef.current === recognition) {
            setTimeout(() => { if (recognitionRef.current === recognition) startRecognition(); }, 200);
          }
        };
        try { recognition.start(); } catch (e) { console.warn("Could not start recognition:", e); }
      };
      startRecognition();
    } else {
      whisperModeRef.current = true;
      chunkTimerRef.current = setInterval(sendPendingChunks, CHUNK_INTERVAL_MS);
    }

    setRecording(true);
    appClient.analytics.track({ eventName: "recording_started", properties: { audio_mode: mode, language: selectedLanguage } });

    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', async () => {
          if (mediaRecorderRef.current?.state === 'recording') {
            try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {}
          }
        });
      } catch (e) {
        console.warn('Wake lock not available:', e.message);
      }
    }

    clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setInterval(() => {
      if (performAutoSaveRef.current) performAutoSaveRef.current();
    }, 30000);

    if (mode === AUDIO_MODES.INTERNAL || mode === AUDIO_MODES.SCREEN_AUDIO) {
      let watchdogInterval = setInterval(() => {
        const timeSinceLastChunk = Date.now() - lastChunkTime;
        if (timeSinceLastChunk > 60000 && mediaRecorderRef.current?.state === 'recording') {
          console.warn(`No audio chunks for ${Math.round(timeSinceLastChunk / 1000)}s — audio capture may have stalled`);
        }
      }, 5000);
      if (!window.__recordingWatchdogs) window.__recordingWatchdogs = [];
      window.__recordingWatchdogs.push(watchdogInterval);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // UPLOAD / PASTE / URL HANDLERS (UPDATED with billing metadata)
  // ─────────────────────────────────────────────────────────────────

  const handleUploadFile = async (file) => {
    if (!file) return;
    const mb = file.size / 1024 / 1024;
    if (mb > 25) {
      setError("File too large (max 25 MB)");
      return;
    }

    setError(null);
    setUploadStage({ type: "uploading", progress: 10, label: `Uploading ${file.name}…` });

    try {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      setUploadStage({ type: "transcribing", progress: 35, label: "Starting transcription with Whisper…" });

      const langCode = selectedLanguage?.split("-")[0] || "en";

      const tickInterval = setInterval(() => {
        setUploadStage((prev) =>
          prev?.type === "transcribing"
            ? {
                ...prev,
                progress: Math.min((prev.progress || 35) + 2, 88),
                label: "Transcribing audio with Whisper AI…",
              }
            : prev
        );
      }, 1200);

      const res = await appClient.functions.invoke("transcribeAudio", { audio_url: file_url, language: langCode });
      clearInterval(tickInterval);

      setUploadStage({ type: "analyzing", progress: 95, label: "Saving session…" });

      const transcript = res.data?.transcript || "";
      const now = new Date();
      const title = `${file.name.replace(/\.[^.]+$/, "")} — ${now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;

      const user = await appClient.auth.me();
      const transcriptPayload = await buildTranscriptPayloadForSessionCreate(transcript);

      // Patch 3A: Audio Upload - Add billing metadata
      const session = await appClient.entities.Session.create({
        user_email: user.email,
        title,
        audio_file_url: file_url,
        ...transcriptPayload,
        processing_status: "pending",
        manual_notes: serializeNotes(quickNotesRef.current),
        source: "audio_upload",
        duration: Math.max(1, Math.ceil((file?.size || 0) / 16000)), // rough fallback seconds
        billing_source: "audio_upload",
        billable_minutes_estimate: Math.max(1, Math.ceil((file?.size || 0) / 16000 / 60)), // rough estimate in minutes
        ...sessionContext,
      });

      appClient.functions.invoke("processSessionBackground", { session_id: session.id }).catch(() => {});
      navigate(`/SessionDetail?id=${session.id}`);
    } catch (e) {
      setError(e.message || "Upload failed");
      setUploadStage(null);
    }
  };

  const handleVideoUrl = async (url) => {
    if (!url.trim()) {
      setError("Please enter a valid video URL");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Invalid URL format. Please enter a complete URL starting with http:// or https://");
      return;
    }

    setError(null);

    setUploadStage({ type: "link_fetching", progress: 0, label: "Fetching video link…" });
    const linkTickInterval = setInterval(() => {
      setUploadStage((prev) =>
        prev?.type === "link_fetching"
          ? { ...prev, progress: Math.min((prev.progress || 0) + 3, 90), label: "Analyzing video link…" }
          : prev
      );
    }, 400);

    let res;
    try {
      res = await appClient.functions.invoke("processVideoUrl", { video_url: url });
    } catch (e) {
      clearInterval(linkTickInterval);
      setError(e.message || "Failed to process video URL");
      setUploadStage(null);
      return;
    }
    clearInterval(linkTickInterval);

    if (res.data?.error) {
      setError(res.data.error);
      setUploadStage(null);
      return;
    }

    setUploadStage({ type: "link_fetching", progress: 100, label: "Link analyzed!" });
    await new Promise((r) => setTimeout(r, 250));

    setUploadStage({ type: "getting_audio", progress: 0, label: "Extracting audio…" });
    await new Promise((r) => {
      let p = 0;
      const id = setInterval(() => {
        p = Math.min(p + 8, 100);
        setUploadStage({ type: "getting_audio", progress: p, label: "Getting audio from video…" });
        if (p >= 100) {
          clearInterval(id);
          r();
        }
      }, 60);
    });

    setUploadStage({ type: "transcribing", progress: 0, label: "Transcribing audio…" });
    await new Promise((r) => {
      let p = 0;
      const id = setInterval(() => {
        p = Math.min(p + 6, 100);
        setUploadStage({ type: "transcribing", progress: p, label: "Transcription complete!" });
        if (p >= 100) {
          clearInterval(id);
          r();
        }
      }, 50);
    });

    try {
      const transcriptText = res.data?.transcript || "";
      if (!transcriptText) {
        throw new Error(
          "No transcript could be extracted from this video. The video may be unavailable, private, or not supported."
        );
      }

      setUploadStage({ type: "analyzing", progress: 0, label: "Analyzing content…" });
      await new Promise((r) => {
        let p = 0;
        const id = setInterval(() => {
          p = Math.min(p + 10, 100);
          setUploadStage({ type: "analyzing", progress: p, label: "Saving session…" });
          if (p >= 100) {
            clearInterval(id);
            r();
          }
        }, 60);
      });

      const now = new Date();
      const title = `Video Session — ${now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;

      const userMe = await appClient.auth.me();
      const transcriptPayload = await buildTranscriptPayloadForSessionCreate(transcriptText);

      // Patch 3B: Video URL - Add billing metadata
      const session = await appClient.entities.Session.create({
        user_email: userMe.email,
        title,
        video_url: url,
        ...transcriptPayload,
        processing_status: "pending",
        manual_notes: serializeNotes(quickNotesRef.current),
        source: "video_url",
        billing_source: "video_url",
        duration: Number(res.data?.duration_seconds || 0),
        billable_minutes_estimate: Math.max(1, Math.ceil(transcriptText.split(/\s+/).filter(Boolean).length / 150)),
        ...sessionContext,
      });

      appClient.functions.invoke("processSessionBackground", { session_id: session.id }).catch(() => {});
      navigate(`/SessionDetail?id=${session.id}`);
    } catch (e) {
      const errorMsg = e.message || "Failed to process video URL";
      if (errorMsg.includes("status code 500")) {
        setError("Video processing service temporarily unavailable. Please try again in a moment.");
      } else if (errorMsg.includes("status code 429")) {
        setError("Too many requests. Please wait a moment and try again.");
      } else if (errorMsg.includes("not found") || errorMsg.includes("401") || errorMsg.includes("403")) {
        setError("Video is not accessible. It may be private, deleted, or the URL is incorrect.");
      } else {
        setError(errorMsg);
      }
      setUploadStage(null);
    }
  };

  const handlePasteText = async (text) => {
    setError(null);
    setUploadStage({ type: "analyzing", progress: 60, label: "Saving your text…" });

    try {
      const now = new Date();
      const title = `Text Session — ${now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;

      const user = await appClient.auth.me();
      const transcriptPayload = await buildTranscriptPayloadForSessionCreate(text);

      // Patch 3C: Paste Text - Calculate estimated minutes from word count
      const wordCount = String(text || "").trim().split(/\s+/).filter(Boolean).length;
      const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 150));

      const session = await appClient.entities.Session.create({
        user_email: user.email,
        title,
        ...transcriptPayload,
        processing_status: "pending",
        manual_notes: serializeNotes(quickNotesRef.current),
        source: "text",
        duration: estimatedMinutes * 60,
        billing_source: "pasted_text",
        billable_minutes_estimate: estimatedMinutes,
        ...sessionContext,
      });

      appClient.functions.invoke("processSessionBackground", { session_id: session.id }).catch(() => {});
      navigate(`/SessionDetail?id=${session.id}`);
    } catch (e) {
      setError(e.message || "Failed to process text");
      setUploadStage(null);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setError(null);
    setUploadStage({ type: "uploading", progress: 15, label: "Uploading image…" });

    try {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      setUploadStage({ type: "transcribing", progress: 50, label: "Extracting text with AI vision…" });

      const res = await appClient.integrations.Core.InvokeLLM({
        prompt:
          "This image contains handwritten or printed meeting minutes/notes. Extract ALL text from the image exactly as written, preserving the structure and content. Return only the extracted text, nothing else.",
        file_urls: [file_url],
      });

      const extractedText = typeof res === "string" ? res : res?.text || res?.content || "";
      setUploadStage({ type: "analyzing", progress: 92, label: "Saving session…" });

      // Patch 3D: Image OCR - Calculate estimated minutes from extracted text
      const wordCount = String(extractedText || "").trim().split(/\s+/).filter(Boolean).length;
      const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 150));

      const now = new Date();
      const title = `Handwritten Minutes — ${now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;

      const user = await appClient.auth.me();
      const transcriptPayload = await buildTranscriptPayloadForSessionCreate(extractedText);

      const session = await appClient.entities.Session.create({
        user_email: user.email,
        title,
        ...transcriptPayload,
        processing_status: "pending",
        manual_notes: serializeNotes(quickNotesRef.current),
        source: "images",
        image_urls: [file_url],
        duration: estimatedMinutes * 60,
        billing_source: "image_ocr",
        billable_minutes_estimate: estimatedMinutes,
        ...sessionContext,
      });

      appClient.functions.invoke("processSessionBackground", { session_id: session.id }).catch(() => {});
      navigate(`/SessionDetail?id=${session.id}`);
    } catch (e) {
      setError(e.message || "Failed to extract text from image");
      setUploadStage(null);
    }
  };

  // ──────────────────────────── RENDER ────────────────────────────

  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]';
  const card = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const border = isDark ? 'border-white/8' : 'border-gray-100';
  const textSub = isDark ? 'text-white/40' : 'text-gray-400';

  const handleSelectMode = (mode) => {
    setSelectedMode(mode);
    if (support && support.needsSetup && mode !== AUDIO_MODES.MICROPHONE) {
      setCaptureFlow('setup');
    } else {
      setCaptureFlow('recording');
      startRecording(mode);
    }
  };

  // ── Mode Selection Screen ──
  if (captureFlow === 'select_mode' && support) {
    const recommendedMode = getRecommendedMode(platform);
    return (
      <div className={`${bg} min-h-screen py-8 px-5 pb-24`}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setCaptureFlow('start')} className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${isDark ? 'bg-white/5 border-white/8 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Capture Audio</h1>
              <p className={`text-sm ${textSub}`}>Select how you want to record</p>
            </div>
          </div>
          <div className="space-y-3 mb-8">
            {[
              { mode: AUDIO_MODES.INTERNAL, label: 'Internal Audio', icon: '🎧', description: getModeDescription(AUDIO_MODES.INTERNAL) },
              { mode: AUDIO_MODES.MICROPHONE, label: 'Microphone', icon: '🎤', description: getModeDescription(AUDIO_MODES.MICROPHONE) },
              { mode: AUDIO_MODES.INTERNAL_MIC, label: 'Internal + Mic', icon: '🎙️', description: getModeDescription(AUDIO_MODES.INTERNAL_MIC) },
              { mode: AUDIO_MODES.SCREEN_AUDIO, label: 'Screen + Audio', icon: '📺', description: getModeDescription(AUDIO_MODES.SCREEN_AUDIO) }
            ].map(({ mode, label, icon, description }) => (
              <AudioModeCard key={mode} mode={mode} label={label} description={description} icon={icon}
                supported={isModeSupported(mode, platform)} recommended={mode === recommendedMode}
                onClick={() => isModeSupported(mode, platform) && handleSelectMode(mode)}
                reason={!isModeSupported(mode, platform) ? `Not available on ${platform}` : null}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Setup Screen ──
  if (captureFlow === 'setup' && support) {
    return (
      <DeviceSetupAssistant onClose={() => {
        setCaptureFlow('recording');
        startRecording(selectedMode || AUDIO_MODES.MICROPHONE);
      }} />
    );
  }

  // ── Unsupported ──
  if (captureFlow === 'unsupported') {
    return (
      <UnsupportedFallback
        reason={platform === 'ios' ? 'ios' : 'unsupported'}
        onSelectMicrophone={() => { setSelectedMode(AUDIO_MODES.MICROPHONE); setCaptureFlow('recording'); startRecording(AUDIO_MODES.MICROPHONE); }}
        onSelectScreen={() => { setSelectedMode(AUDIO_MODES.SCREEN_AUDIO); setCaptureFlow('recording'); startRecording(AUDIO_MODES.SCREEN_AUDIO); }}
        onLearnMore={() => navigate('/Settings')}
      />
    );
  }

  // ── Permission Denied ──
  if (captureFlow === 'permission_denied' || permissionDenied) {
    const isMic = permissionDenied === 'microphone';
    return (
      <div className={`min-h-screen ${bg} flex flex-col items-center justify-center px-6`}>
        <div className={`max-w-sm w-full ${card} rounded-3xl p-8 text-center`}>
          <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">{isMic ? '🎤' : '🖥️'}</span>
          </div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{isMic ? 'Microphone' : 'Internal Audio'} Permission Required</h2>
          <p className={`text-sm mb-6 leading-relaxed ${textSub}`}>
            {isMic ? 'Allow microphone access in your browser settings.' : 'Select a tab or window to share, then make sure to check ✅ "Share tab audio" or "Share system audio" in the browser dialog — otherwise no audio will be captured.'}
          </p>
          <div className="space-y-3">
            <button onClick={() => { setPermissionDenied(null); setCaptureFlow('recording'); startRecording(selectedMode || AUDIO_MODES.MICROPHONE); }}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }}>
              Try Again
            </button>
            <button onClick={() => { setPermissionDenied(null); setCaptureFlow('select_mode'); }}
              className={`w-full py-3 rounded-2xl text-sm font-medium ${textSub} hover:text-white transition-colors`}>
              Choose Different Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active Recording Screen ──
  if (captureFlow === 'recording' && recording) {
    return (
      <div className={`${bg} min-h-screen py-6 px-5 pb-24 overflow-y-auto`}>
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => setRecording(false)} className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${isDark ? 'bg-white/5 border-white/8' : 'bg-white border-gray-200'}`}>
              <X className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold">Recording</h1>
            {isSubsessionMode && (
              <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 font-medium">
                Part {subsessions.length + 1}
              </span>
            )}
          </div>

          {/* Controls */}
          <div className={`rounded-2xl border p-5 ${card} ${border}`}>
            <div className="flex flex-col items-center gap-4">
              <RecordingIndicator duration={duration} />
              {paused && <p className={`text-xs ${textSub}`}>Paused</p>}
              
              {/* Animated Waveform - Large Dynamic Display */}
              <AnimatedWaveform bars={waveformBars} isRecording={recording && !paused} />
              
              {/* Signal Quality + Audio Source Row */}
              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex-1">
                  <SignalQualityIndicator soundLevel={soundLevel} isRecording={recording && !paused} audioMode={selectedMode} />
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium shrink-0 ${isDark ? 'bg-white/5 text-white/60' : 'bg-gray-100 text-gray-600'}`}>
                  <span>🎤</span>
                  <span>{selectedMode === AUDIO_MODES.INTERNAL ? 'Internal' : selectedMode === AUDIO_MODES.INTERNAL_MIC ? 'Both' : 'Microphone'}</span>
                </div>
              </div>

              {/* Internal audio tip */}
              {(selectedMode === AUDIO_MODES.INTERNAL || selectedMode === AUDIO_MODES.INTERNAL_MIC) && soundLevel < 5 && (
                <div className="w-full px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-[11px] text-amber-400">No audio detected — make sure you checked <strong>"Share tab audio"</strong> or <strong>"Share system audio"</strong> in the browser dialog</p>
                </div>
              )}
              
              {/* Control Buttons */}
              <div className="flex items-center gap-5 mt-1">
                <button onClick={togglePause} className="flex flex-col items-center gap-1 group">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-colors ${isDark ? 'bg-white/8 border-white/10 group-hover:bg-white/15' : 'bg-gray-100 border-gray-200 group-hover:bg-gray-200'}`}>
                    {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  </div>
                  <span className={`text-[10px] ${textSub}`}>{paused ? 'Resume' : 'Pause'}</span>
                </button>
                <button onClick={() => stopRecording({ startNew: false })} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#EF4444', boxShadow: '0 4px 12px rgba(239,68,68,0.4)' }}>
                    <Square className="w-5 h-5 text-white fill-current" />
                  </div>
                  <span className={`text-[10px] ${textSub}`}>Stop</span>
                </button>
                <button onClick={() => stopRecording({ startNew: true })} className="flex flex-col items-center gap-1 group">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border border-purple-500/50 bg-purple-500/15 group-hover:bg-purple-500/25 transition-colors">
                    <Plus className="w-5 h-5 text-purple-300" />
                  </div>
                  <span className="text-[10px] text-purple-400/70">Stop & New</span>
                </button>
                <button 
                  onClick={() => setIsImportant(!isImportant)} 
                  className="flex flex-col items-center gap-1 group"
                  title={isImportant ? 'Marked as important' : 'Mark as important'}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-colors ${
                    isImportant 
                      ? 'bg-yellow-500/20 border-yellow-500/50' 
                      : isDark ? 'bg-white/8 border-white/10 group-hover:bg-white/15' : 'bg-gray-100 border-gray-200 group-hover:bg-gray-200'
                  }`}>
                    <Star className={`w-5 h-5 ${isImportant ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </div>
                  <span className={`text-[10px] ${isImportant ? 'text-yellow-400' : textSub}`}>Important</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sub-session list */}
          <SubSessionList 
            subsessions={subsessions}
            onRetryFailed={(sub) => {
              setSubsessions(prev => prev.map(s =>
                s.localId === sub.localId ? { ...s, status: 'processing' } : s
              ));
              const poll = setInterval(async () => {
                try {
                  const updated = await appClient.entities.Session.get(sub.sessionId);
                  if (updated.processing_status === 'done' || updated.processing_status === 'failed') {
                    clearInterval(poll);
                    setSubsessions(prev => prev.map(s =>
                      s.localId === sub.localId ? { ...s, status: updated.processing_status, transcript: updated.transcript_text || s.transcript } : s
                    ));
                  }
                } catch {}
              }, 4000);
            }}
          />

          {/* Silo Agent */}
          <SiloAgent 
            segments={segments} 
            notes={quickNotes} 
            subsessions={subsessions}
            chunkInsights={chunkInsights} 
            isRecording={recording} 
            isPaused={paused} 
          />

          {/* Quick Notes */}
          <QuickNotes notes={quickNotes} onAddNote={handleAddNote} duration={duration} />

          {/* Live Transcript */}
          <LiveTranscriptBox segments={segments} isDark={isDark} textSub={textSub} card={card} border={border} />
        </div>
      </div>
    );
  }

  // ── Saving Screen ──
  if (saving) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
        <div className="w-24 h-24 rounded-full mb-6 orb-breathe"
          style={{ background: "radial-gradient(circle at 40% 35%, #C084FC, #818CF8 50%, #38BDF8)", boxShadow: "0 0 40px rgba(139,92,246,0.4)" }} />
        <p className="text-white font-semibold text-sm mb-1">
          {uploadStage === 'processing_last' ? 'Processing last part…' : isSubsessionMode ? 'Merging all parts…' : 'Saving your session…'}
        </p>
        <p className="text-white/40 text-xs px-4 text-center">
          {uploadStage === 'processing_last' ? 'Transcribing & analyzing before merging' : 'AI analysis will run in the background'}
        </p>
      </div>
    );
  }

  // ── Start Screen ──
  const recommendedMode = platform ? getRecommendedMode(platform) : AUDIO_MODES.MICROPHONE;
  const modes = [
    { mode: AUDIO_MODES.MICROPHONE, label: 'Microphone', icon: '🎤', description: 'Your voice only' },
    { mode: AUDIO_MODES.INTERNAL, label: 'Internal Audio', icon: '🎧', description: 'Remote speakers only' },
    { mode: AUDIO_MODES.INTERNAL_MIC, label: 'Internal + Mic', icon: '🎙️', description: '⭐ Best for meetings' },
  ];

  return (
    <div className={`${bg} min-h-screen py-8 px-5 pb-24 flex flex-col`}>
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${isDark ? 'bg-white/5 border-white/8 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold">New Session</h1>
        </div>

        {/* Language Selector */}
        <div className="mb-4">
          <p className={`text-xs font-semibold uppercase tracking-wider ${textSub} mb-3`}>Language</p>
          <LanguageSelector value={selectedLanguage} onChange={setSelectedLanguage} />
        </div>

        {/* Minutes Status */}
        <MinutesStatusBar />

        {/* Record Button */}
        <div className="flex flex-col items-center gap-4 my-8">
          <button
            onClick={() => {
              const mode = selectedMode || recommendedMode;
              if (support?.needsSetup && mode !== AUDIO_MODES.MICROPHONE) {
                setCaptureFlow('setup');
              } else {
                setCaptureFlow('recording');
                startRecording(mode);
              }
            }}
            className="relative w-40 h-40 rounded-full flex items-center justify-center active:scale-95 transition-transform duration-200"
          >
            <div className="absolute inset-0 rounded-full blur-2xl opacity-60" style={{ background: "radial-gradient(circle at 40% 35%, #C084FC, #818CF8 50%, #38BDF8)" }} />
            <div className="absolute inset-3 rounded-full" style={{ background: "radial-gradient(circle at 40% 35%, #C084FC, #818CF8 50%, #38BDF8)" }} />
          </button>
          <div className="text-center">
            <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tap to Record</p>
            <p className={`text-xs ${textSub} mt-1`}>Using: {modes.find(m => m.mode === (selectedMode || recommendedMode))?.label || 'Microphone'}</p>
          </div>
        </div>

        {/* Transcription Sources + Context */}
        <div className="space-y-4">
          <TranscriptionSources
            onUploadFile={handleUploadFile}
            onVideoUrl={handleVideoUrl}
            onPasteText={handlePasteText}
            onImageUpload={handleImageUpload}
            uploadStage={uploadStage}
            error={error}
          />

          {/* Session Context Panel */}
          <SessionContextPanel onChange={setSessionContext} />

          {/* Audio Mode Selector */}
          <Collapsible open={audioSourceOpen} onOpenChange={setAudioSourceOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-between mb-3">
              <p className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Audio Source</p>
              <ChevronDown className={`w-4 h-4 transition-transform ${audioSourceOpen ? 'rotate-180' : ''} ${textSub}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2">
                {modes.map(({ mode, label, icon, description }) => {
                  const supported = !platform || isModeSupported(mode, platform);
                  const isSelected = selectedMode === mode;
                  const isRecommended = mode === recommendedMode;
                  return (
                    <button key={mode} disabled={!supported} onClick={() => supported && setSelectedMode(mode)}
                      className={`w-full ${card} rounded-2xl border p-4 text-left transition-all ${!supported ? 'opacity-40 cursor-not-allowed' : isSelected ? 'border-purple-500 ring-1 ring-purple-500/40' : `${border} hover:border-purple-400/50`}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</span>
                            {isRecommended && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-500/20 text-purple-400">Recommended</span>}
                          </div>
                          <p className={`text-xs mt-0.5 ${textSub}`}>{description}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-purple-500 bg-purple-500' : isDark ? 'border-white/20' : 'border-gray-300'}`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {(selectedMode === AUDIO_MODES.MICROPHONE || !selectedMode) && (
            <MicSettings selectedDeviceId={selectedDeviceId} onDeviceChange={setSelectedDeviceId} disabled={recording} />
          )}
        </div>
      </div>
    </div>
  );
}