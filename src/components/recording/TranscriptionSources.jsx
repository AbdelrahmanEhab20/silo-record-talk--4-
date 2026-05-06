import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { Upload, Link, FileText, Image, Loader2, AlertCircle, ChevronRight, ChevronDown, CheckCircle2 } from "lucide-react";

/**
 * TranscriptionSources
 * Shows alternative transcription input methods:
 * - Upload audio file
 * - Video URL (YouTube, etc.)
 * - Paste text (direct text transcript)
 * Each has a clear "Process" action button.
 */
const STAGES = [
  { key: 'uploading',     label: 'Uploading' },
  { key: 'link_fetching', label: 'Link Fetching' },
  { key: 'getting_audio', label: 'Getting Audio' },
  { key: 'transcribing',  label: 'Transcribing' },
  { key: 'analyzing',     label: 'Analyzing' },
];

function ProcessingProgress({ stage, isDark }) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    // Animate toward target progress smoothly
    const target = stage.progress ?? 0;
    const step = () => {
      setAnimatedProgress(prev => {
        if (prev >= target) return target;
        return Math.min(prev + 1, target);
      });
    };
    const id = setInterval(step, 18);
    return () => clearInterval(id);
  }, [stage.progress]);

  // Fake slow creep when transcribing (Whisper can take time)
  useEffect(() => {
    if (stage.type !== 'transcribing') return;
    const id = setInterval(() => {
      setAnimatedProgress(prev => prev < 92 ? prev + 0.3 : prev);
    }, 600);
    return () => clearInterval(id);
  }, [stage.type]);

  const activeIdx = STAGES.findIndex(s => s.key === stage.type);

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'bg-[#1C1C1E] border-white/8' : 'bg-white border-gray-200'}`}>
      {/* Stage pills — show only relevant stages for this flow */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(() => {
          const isVideoFlow = ['link_fetching', 'getting_audio'].includes(stage.type) ||
            (stage.type === 'transcribing' && !stage.label?.toLowerCase().includes('whisper')) ||
            (stage.type === 'analyzing' && !stage.label?.toLowerCase().includes('uploading'));
          const videoStages = STAGES.filter(s => ['link_fetching', 'getting_audio', 'transcribing', 'analyzing'].includes(s.key));
          const uploadStages = STAGES.filter(s => ['uploading', 'transcribing', 'analyzing'].includes(s.key));
          // Detect video flow by presence of link_fetching/getting_audio keys
          const activeKey = stage.type;
          const isVideo = ['link_fetching', 'getting_audio'].includes(activeKey) ||
            (activeKey === 'transcribing' && stage._flow === 'video') ||
            (activeKey === 'analyzing' && stage._flow === 'video');
          const visibleStages = (activeKey === 'link_fetching' || activeKey === 'getting_audio' ||
            (activeKey === 'transcribing' && !['uploading'].includes(activeKey)) && videoStages.some(s => s.key === activeKey))
            ? videoStages : uploadStages;

          // Simple: show video stages if any video-specific key is active
          const showVideoStages = ['link_fetching', 'getting_audio'].includes(activeKey);
          const finalStages = showVideoStages ? videoStages :
            (activeKey === 'uploading' ? uploadStages : STAGES.filter(s => s.key !== 'link_fetching' && s.key !== 'getting_audio'));

          return finalStages.map((s, i) => {
            const idx = STAGES.findIndex(x => x.key === s.key);
            const done = idx < activeIdx;
            const active = idx === activeIdx;
            return (
              <div key={s.key} className="flex items-center gap-1">
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  done ? 'bg-green-500/15 text-green-400' :
                  active ? 'bg-purple-500/20 text-purple-300' :
                  isDark ? 'bg-white/5 text-white/25' : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? <CheckCircle2 className="w-3 h-3" /> : active ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-3 h-3 rounded-full border border-current opacity-40 inline-block" />}
                  {s.label}
                </div>
                {i < finalStages.length - 1 && (
                  <div className={`w-3 h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* Progress bar */}
      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/8' : 'bg-gray-100'}`}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${animatedProgress}%`, background: 'linear-gradient(90deg, #A855F7, #6366F1)' }}
        />
      </div>

      {/* Label + % */}
      <div className="flex items-center justify-between">
        <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{stage.label || 'Processing…'}</p>
        <p className="text-xs font-semibold text-purple-400">{Math.round(animatedProgress)}%</p>
      </div>
    </div>
  );
}

// uploadStage: null | { type: 'uploading'|'fetching'|'transcribing'|'analyzing', progress: 0-100, label: string }
export default function TranscriptionSources({ onUploadFile, onVideoUrl, onPasteText, onImageUpload, uploadStage, error }) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null); // 'audio' | 'video' | 'text' | null
  const [videoUrl, setVideoUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const uploadInputRef = useRef(null);
  const imageLibraryRef = useRef(null);
  const imageCameraRef = useRef(null);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const inputClass = isDark
    ? "bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500/60 focus:outline-none"
    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:outline-none";

  const options = [
    { id: "audio", icon: <Upload className="w-4 h-4" />, label: "Upload Audio File", sub: "MP3, WAV, M4A, WebM…", badge: "Beta", note: "Max 25 MB" },
    { id: "image", icon: <Image className="w-4 h-4" />, label: "Upload Minutes as Image", sub: "Photo of handwritten or printed notes", badge: "Beta", note: "Max 10 MB" },
    { id: "video", icon: <Link className="w-4 h-4" />, label: "Transcribe from Video URL", sub: "YouTube, Loom, any video link", badge: "Beta", note: "Max 10 min" },
    { id: "text", icon: <FileText className="w-4 h-4" />, label: "Paste Text to Transcribe", sub: "Paste meeting notes or transcript", badge: "Beta" },
  ];

  const toggle = (id) => {
    if (id === "audio") {
      uploadInputRef.current?.click();
      return;
    }
    if (id === "image") {
      setShowImagePicker(true);
      return;
    }
    setExpanded((prev) => (prev === id ? null : id));
  };

  const isProcessing = !!uploadStage;

  return (
    <div className="space-y-2">
      {/* Collapsible wrapper styled like Session Context */}
      <div className={`rounded-2xl border ${card}`}>
         <button
           onClick={() => setOpen(o => !o)}
           className="w-full flex items-center justify-between px-4 py-3"
         >
           <div className="flex items-center gap-2">
             <p className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Other Options</p>
             {!open && (
               <div className="flex items-center gap-1.5">
                 <Upload className="w-3.5 h-3.5 text-purple-400" />
                 <Image className="w-3.5 h-3.5 text-purple-400" />
                 <Link className="w-3.5 h-3.5 text-purple-400" />
                 <FileText className="w-3.5 h-3.5 text-purple-400" />
               </div>
             )}
           </div>
           <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""} ${textSub}`} />
         </button>

      {open && <div className="px-3 pb-3 space-y-2">
      {options.map(({ id, icon, label, sub, badge, note }) => (
        <div key={id}>
          <button
            onClick={() => toggle(id)}
            disabled={isProcessing}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors text-left ${card} ${
              expanded === id
                ? "border-purple-500/50"
                : isDark
                ? "hover:bg-white/5"
                : "hover:bg-gray-50"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className={`shrink-0 ${expanded === id ? "text-purple-400" : textSub}`}>{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-medium ${isDark ? "text-white/80" : "text-gray-700"}`}>{label}</p>
                {badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">{badge}</span>
                )}
                {note && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? "bg-white/8 text-white/40" : "bg-gray-100 text-gray-400"}`}>{note}</span>
                )}
              </div>
              <p className={`text-xs ${textSub}`}>{sub}</p>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${expanded === id ? "rotate-90 text-purple-400" : textSub}`} />
          </button>

          {/* Video URL expanded */}
          {id === "video" && expanded === "video" && (
            <div className={`mt-1.5 rounded-2xl border ${card} p-4 space-y-3`}>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=... or any video URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className={`w-full rounded-xl px-3 py-2.5 text-sm ${inputClass}`}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setExpanded(null); setVideoUrl(""); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (videoUrl.trim()) { onVideoUrl(videoUrl.trim()); setVideoUrl(""); setExpanded(null); } }}
                  disabled={!videoUrl.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
                >
                  Process Video
                </button>
              </div>
            </div>
          )}

          {/* Paste Text expanded */}
          {id === "text" && expanded === "text" && (
            <div className={`mt-1.5 rounded-2xl border ${card} p-4 space-y-3`}>
              <textarea
                placeholder="Paste your text, meeting notes, or transcript here…"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={5}
                className={`w-full rounded-xl px-3 py-2.5 text-sm resize-none ${inputClass}`}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setExpanded(null); setPastedText(""); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? "border-white/10 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (pastedText.trim()) { onPasteText(pastedText.trim()); setPastedText(""); setExpanded(null); } }}
                  disabled={!pastedText.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
                >
                  Process Text
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      </div>}
      </div>

      {/* Rich processing progress */}
      {isProcessing && uploadStage && typeof uploadStage === 'object' && (
        <ProcessingProgress stage={uploadStage} isDark={isDark} />
      )}
      {/* Legacy string stage fallback */}
      {isProcessing && typeof uploadStage === 'string' && (
        <ProcessingProgress stage={{ type: uploadStage, progress: uploadStage === 'uploading' ? 40 : 75, label: uploadStage === 'uploading' ? 'Uploading file…' : 'Transcribing with AI…' }} isDark={isDark} />
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 rounded-xl px-4 py-3 text-xs border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Hidden file inputs */}
      {/* Audio: no capture attribute so it opens file browser only */}
      <input
        ref={uploadInputRef}
        type="file"
        accept=".mp3,.wav,.m4a,.webm,.ogg,.aac"
        className="hidden"
        onChange={(e) => { onUploadFile(e.target.files?.[0]); e.target.value = ''; }}
      />
      {/* Image: library picker (no capture) */}
      <input
        ref={imageLibraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { onImageUpload && onImageUpload(e.target.files?.[0]); e.target.value = ''; setShowImagePicker(false); }}
      />
      {/* Image: camera capture */}
      <input
        ref={imageCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { onImageUpload && onImageUpload(e.target.files?.[0]); e.target.value = ''; setShowImagePicker(false); }}
      />

      {/* Image picker modal */}
      {showImagePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowImagePicker(false)}>
          <div className={`w-full max-w-lg rounded-t-3xl p-5 space-y-2 ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <p className={`text-xs text-center font-semibold uppercase tracking-wider mb-3 ${textSub}`}>Upload Minutes as Image</p>
            <button
              onClick={() => imageLibraryRef.current?.click()}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border text-left transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
            >
              <Image className="w-5 h-5 text-purple-400" />
              <span className={`text-sm font-medium ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Choose from Library</span>
            </button>
            <button
              onClick={() => imageCameraRef.current?.click()}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border text-left transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
            >
              <span className="text-purple-400">📷</span>
              <span className={`text-sm font-medium ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Take Photo</span>
            </button>
            <button
              onClick={() => setShowImagePicker(false)}
              className={`w-full py-3 rounded-2xl text-sm font-medium mt-1 ${isDark ? 'text-white/40 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}