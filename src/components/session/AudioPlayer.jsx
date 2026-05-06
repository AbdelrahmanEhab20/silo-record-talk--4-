import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { usePlayback } from "@/lib/PlaybackContext";

const BAR_COUNT = 80;

// Parse timestamps from transcript text like [00:12] or [1:23:45]
function parseKeyMoments(transcript) {
  if (!transcript) return [];
  const regex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;
  const moments = [];
  let match;
  while ((match = regex.exec(transcript)) !== null) {
    const h = match[3] ? parseInt(match[1]) : 0;
    const m = match[3] ? parseInt(match[2]) : parseInt(match[1]);
    const s = match[3] ? parseInt(match[3]) : parseInt(match[2]);
    const seconds = h * 3600 + m * 60 + s;
    if (!moments.find(x => Math.abs(x - seconds) < 3)) {
      moments.push(seconds);
    }
  }
  return moments;
}

export default function AudioPlayer({ audioUrl, transcript, onSeekToTranscript, fallbackDuration, onDurationDetected }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState([]);
  const [loadingWave, setLoadingWave] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const isDark = document.documentElement.classList.contains("dark");
  const { seekTime } = usePlayback();

  const keyMoments = parseKeyMoments(transcript);

  // Build waveform from audio data
  useEffect(() => {
    if (!audioUrl) return;
    setWaveform([]);
    setLoadingWave(true);

    const buildWaveform = async () => {
      try {
        const res = await fetch(audioUrl);
        const arrayBuffer = await res.arrayBuffer();
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const data = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(data.length / BAR_COUNT);
        const bars = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(data[i * blockSize + j]);
          }
          bars.push(sum / blockSize);
        }
        const max = Math.max(...bars);
        setWaveform(bars.map(b => max > 0 ? b / max : 0));
        ctx.close();
      } catch {
        // fallback: random waveform
        setWaveform(Array.from({ length: BAR_COUNT }, () => 0.2 + Math.random() * 0.8));
      }
      setLoadingWave(false);
    };

    buildWaveform();
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(0);
    setDuration(fallbackDuration > 0 ? fallbackDuration : 0);
    setPlaying(false);

    let pollId = null;

    const applyDuration = (d) => {
      if (isFinite(d) && d > 0) {
        setDuration(d);
        onDurationDetected?.(d);
        if (pollId) { clearInterval(pollId); pollId = null; }
      }
    };

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => applyDuration(audio.duration);
    const onLoaded = () => {
      applyDuration(audio.duration);
      if ((!isFinite(audio.duration) || audio.duration <= 0) && fallbackDuration > 0) {
        setDuration(fallbackDuration);
      }
    };
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.load();

    // Polling fallback for WebM/Ogg where duration may be Infinity until seeked
    pollId = setInterval(() => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        onDurationDetected?.(audio.duration);
        clearInterval(pollId);
        pollId = null;
      }
    }, 500);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      if (pollId) clearInterval(pollId);
    };
  }, [audioUrl, fallbackDuration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setPlaying(true))
        .catch((e) => { console.error('Audio play failed:', e); setPlaying(false); });
    }
  };

  const changeSpeed = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => setPlaying(false));
    setPlaying(true);
  };

  const seekToBar = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = pct * duration;
    if (audioRef.current && duration) {
      audioRef.current.currentTime = t;
    }
    // Jump to nearest transcript section
    if (onSeekToTranscript && keyMoments.length > 0) {
      const nearest = keyMoments.reduce((a, b) => Math.abs(b - t) < Math.abs(a - t) ? b : a);
      if (Math.abs(nearest - t) < duration * 0.05) {
        onSeekToTranscript(nearest);
      }
    }
  };

  const seekToMoment = (sec) => {
    if (audioRef.current && duration) {
      audioRef.current.currentTime = sec;
      if (!playing) { audioRef.current.play().catch(() => {}); setPlaying(true); }
    }
    if (onSeekToTranscript) onSeekToTranscript(sec);
  };

  // Listen for transcript click seeks via context
  useEffect(() => {
    if (seekTime !== null) {
      seekToMoment(seekTime);
    }
  }, [seekTime]);

  const fmt = (s) => {
    if (!s || !isFinite(s) || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const progress = duration ? currentTime / duration : 0;

  if (!audioUrl) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-[#1C1C1E] rounded-xl text-center text-sm text-gray-400 dark:text-[#A1A1A6]">
        No audio available
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-[#1C1C1E] rounded-2xl p-4 space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Waveform */}
      <div
        className="relative w-full h-16 flex items-center gap-[2px] cursor-pointer select-none"
        onClick={seekToBar}
      >
        {loadingWave || waveform.length === 0
          ? Array.from({ length: BAR_COUNT }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-gray-300 dark:bg-white/10 animate-pulse"
                style={{ height: `${20 + Math.random() * 60}%` }}
              />
            ))
          : waveform.map((amp, i) => {
              const barPct = i / BAR_COUNT;
              const isPast = barPct < progress;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(8, amp * 100)}%`,
                    background: isPast
                      ? "linear-gradient(to top, #a855f7, #6366f1)"
                      : "rgba(150,150,160,0.25)",
                  }}
                />
              );
            })}

        {/* Playhead */}
        {duration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80 rounded-full pointer-events-none shadow-lg"
            style={{ left: `${progress * 100}%` }}
          />
        )}
      </div>

      {/* Controls row */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="h-8 w-8 rounded-full bg-gray-900 dark:bg-white hover:opacity-80 text-white dark:text-gray-900 flex items-center justify-center shrink-0 transition-all active:scale-95"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button
            onClick={restart}
            className="h-6 w-6 rounded-full text-gray-400 dark:text-[#A1A1A6] hover:text-gray-600 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <div className="flex-1 flex items-center justify-between text-[11px]">
            <span className="font-mono text-gray-400 dark:text-[#A1A1A6]">{fmt(currentTime)}</span>
            <span className="font-mono text-gray-400 dark:text-[#A1A1A6]">{fmt(duration)}</span>
          </div>
          {duration > 0 && isFinite(duration) && (
            <span className="font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 dark:bg-purple-500/20 dark:text-purple-300 text-[10px] shrink-0">
              {Math.ceil(duration / 60)} min
            </span>
          )}
        </div>
        {/* Playback speed */}
        <div className="flex items-center gap-1">
          {[0.5, 1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => changeSpeed(rate)}
              className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all"
              style={{
                background: playbackRate === rate ? "linear-gradient(135deg, #a855f7, #6366f1)" : "rgba(139,92,246,0.1)",
                color: playbackRate === rate ? "white" : "#a78bfa",
              }}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Key moments strip */}
      {keyMoments.length > 0 && duration > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-1.5">Key Moments</p>
          <div className="flex flex-wrap gap-1.5">
            {keyMoments.slice(0, 12).map((sec, i) => (
              <button
                key={i}
                onClick={() => seekToMoment(sec)}
                className="px-2.5 py-1 rounded-full text-xs font-mono transition-all active:scale-95"
                style={{
                  background: currentTime >= sec && currentTime < (keyMoments[i + 1] || duration)
                    ? "linear-gradient(135deg, #a855f7, #6366f1)"
                    : "rgba(139,92,246,0.12)",
                  color: currentTime >= sec && currentTime < (keyMoments[i + 1] || duration)
                    ? "white"
                    : "#a78bfa",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                {fmt(sec)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}