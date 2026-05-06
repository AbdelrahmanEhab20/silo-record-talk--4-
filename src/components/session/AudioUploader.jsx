import React, { useRef, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const ACCEPTED = ".mp3,.wav,.m4a,.webm,.ogg,.aac";
const MAX_MB = 25;

export default function AudioUploader({ sessionId, onTranscriptReady, onAudioUploaded }) {
  const { isDark } = useTheme();
  const inputRef = useRef(null);
  const [stage, setStage] = useState("idle"); // idle | uploading | transcribing | done | error
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const process = async (file) => {
    if (!file) return;
    const mb = file.size / 1024 / 1024;
    if (mb > MAX_MB) { setError(`File too large (max ${MAX_MB} MB)`); setStage("error"); return; }

    setError(null);
    setStage("uploading");
    try {
      // 1. Read duration from local file BEFORE uploading (avoids CORS issues)
      const localObjectUrl = URL.createObjectURL(file);
      const durationSeconds = await new Promise((resolve) => {
        const audio = new Audio();
        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(localObjectUrl);
          resolve(isFinite(audio.duration) && audio.duration > 0 ? Math.floor(audio.duration) : 0);
        };
        audio.onerror = () => { URL.revokeObjectURL(localObjectUrl); resolve(0); };
        audio.src = localObjectUrl;
        audio.load();
      });

      // 2. Upload to storage
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      onAudioUploaded?.(file_url);

      // 3. Transcribe via Whisper backend function
      setStage("transcribing");
      const res = await appClient.functions.invoke("transcribeAudio", { audio_url: file_url });
      const transcript = res.data?.transcript;
      if (!transcript) throw new Error("No transcript returned");

      // 4. Save transcript + audio url + duration to session
      await appClient.entities.Session.update(sessionId, {
        transcript_text: transcript,
        audio_file_url: file_url,
        ...(durationSeconds > 0 ? { duration: durationSeconds } : {}),
      });

      // 5. Deduct minutes from subscription (only if duration known)
      if (durationSeconds > 0) {
        await appClient.functions.invoke("deductMinutes", {
          minutes: Math.ceil(durationSeconds / 60)
        });
      }

      onTranscriptReady?.(transcript);
      setStage("done");
    } catch (e) {
      setError(e.message || "Processing failed");
      setStage("error");
    }
  };

  const onFileChange = (e) => process(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    process(e.dataTransfer.files?.[0]);
  };

  const border = isDark ? "border-white/10" : "border-gray-200";
  const bg = isDark ? "bg-white/3 hover:bg-white/6" : "bg-gray-50 hover:bg-gray-100";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  if (stage === "done") {
    return (
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${isDark ? "border-green-500/20 bg-green-500/8" : "border-green-200 bg-green-50"}`}>
        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
        <span className="text-sm text-green-400 font-medium">Audio uploaded & transcript ready!</span>
        <button onClick={() => setStage("idle")} className={`ml-auto text-xs ${textSub} hover:text-current transition-colors`}>Upload another</button>
      </div>
    );
  }

  if (stage === "uploading" || stage === "transcribing") {
    return (
      <div className={`flex items-center gap-3 px-4 py-4 rounded-xl border ${border} ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
        <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
        <div>
          <p className="text-sm font-medium">{stage === "uploading" ? "Uploading audio…" : "Transcribing with Whisper…"}</p>
          <p className={`text-xs ${textSub}`}>{stage === "transcribing" ? "This may take a minute for longer recordings" : "Please wait"}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`w-full rounded-xl border-2 border-dashed px-4 py-5 flex flex-col items-center gap-2 transition-all cursor-pointer ${
          dragging
            ? isDark ? "border-purple-500/60 bg-purple-500/10" : "border-purple-400 bg-purple-50"
            : isDark ? "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/6" : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
        }`}
      >
        <Upload className={`w-5 h-5 ${dragging ? "text-purple-400" : textSub}`} />
        <div className="text-center">
          <p className="text-sm font-medium">Upload audio file</p>
          <p className={`text-xs mt-0.5 ${textSub}`}>MP3, WAV, M4A · max {MAX_MB} MB · drag & drop or click</p>
        </div>
      </button>
      <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={onFileChange} />
      {stage === "error" && (
        <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-500"} text-xs`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}