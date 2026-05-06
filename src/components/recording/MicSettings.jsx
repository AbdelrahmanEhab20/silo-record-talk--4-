import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, ChevronDown, Volume2 } from "lucide-react";

export default function MicSettings({ selectedDeviceId, onDeviceChange, disabled = false }) {
  const [devices, setDevices] = useState([]);
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);

  // Stop test when parent signals recording is starting
  useEffect(() => {
    if (disabled && testing) stopTest();
  }, [disabled]);
  const analyzerRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permission first so labels are populated
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        const all = await navigator.mediaDevices.enumerateDevices();
        const mics = all.filter((d) => d.kind === "audioinput");
        setDevices(mics);
        if (!selectedDeviceId && mics.length > 0) {
          onDeviceChange(mics[0].deviceId);
        }
      } catch (e) {
        setError("Mic permission denied");
      }
    };
    loadDevices();
  }, []);

  const startTest = async () => {
    setError(null);
    try {
      const constraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;
      const data = new Uint8Array(analyzer.frequencyBinCount);
      setTesting(true);

      const tick = () => {
        analyzer.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setLevel(Math.min(100, avg / 1.28));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setError("Could not access microphone");
    }
  };

  const stopTest = () => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setLevel(0);
    setTesting(false);
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);
  const deviceLabel = selectedDevice?.label || "Default Microphone";

  return (
    <div className="w-full max-w-xs space-y-3">
      {/* Mic Selector */}
      {devices.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white/70 text-xs"
          >
            <Mic className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="flex-1 text-left truncate">{deviceLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
          </button>
          {showPicker && (
            <div className="absolute top-full mt-1 w-full bg-[#1C1C1E] border border-white/10 rounded-xl overflow-hidden z-10 shadow-2xl">
              {devices.map((d) => (
                <button
                  key={d.deviceId}
                  onClick={() => {
                    onDeviceChange(d.deviceId);
                    setShowPicker(false);
                    if (testing) { stopTest(); }
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                    d.deviceId === selectedDeviceId
                      ? "text-purple-400 bg-purple-500/10"
                      : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Test Button + Level Meter */}
      <div className="flex items-center gap-3">
        <button
          onClick={testing ? stopTest : startTest}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors ${
            testing
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-white/8 border border-white/10 text-white/60 hover:bg-white/12"
          }`}
        >
          {testing ? <MicOff className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {testing ? "Stop test" : "Test mic"}
        </button>

        {testing && (
          <div className="flex-1 flex items-center gap-1 h-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.min(100, 20 + i * 4)}%`,
                  backgroundColor:
                    i / 20 < level / 100
                      ? i > 14
                        ? "#f87171"
                        : i > 9
                        ? "#facc15"
                        : "#a78bfa"
                      : "rgba(255,255,255,0.08)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}