import React, { useState, useRef, useEffect } from "react";
import { Download, Loader2, ChevronDown } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

// Convert AudioBuffer to WAV ArrayBuffer
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataLength = buffer.length * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);

  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return wavBuffer;
}

export default function AudioDownloadMenu({ audioUrl, partLabel }) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [converting, setConverting] = useState(null); // 'mp3' | 'wav' | null
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const downloadOriginal = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${partLabel || 'audio'}.webm`;
    a.target = '_blank';
    a.click();
    setOpen(false);
  };

  const downloadAsWav = async () => {
    setConverting('wav');
    setOpen(false);
    try {
      const res = await fetch(audioUrl);
      const arrayBuf = await res.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await audioCtx.decodeAudioData(arrayBuf);
      const wavBuf = audioBufferToWav(decoded);
      const blob = new Blob([wavBuf], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${partLabel || 'audio'}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      audioCtx.close();
    } catch (e) {
      alert('WAV conversion failed: ' + e.message);
    }
    setConverting(null);
  };

  const downloadAsMp3 = async () => {
    setConverting('mp3');
    setOpen(false);
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${partLabel || 'audio'}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Download failed: ' + e.message);
    }
    setConverting(null);
  };

  const btnClass = `flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`;
  const menuClass = `absolute right-0 top-full mt-1 rounded-xl border shadow-xl z-50 py-1 min-w-[140px] ${isDark ? 'bg-[#2C2C2E] border-white/10' : 'bg-white border-gray-200'}`;
  const itemClass = `w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-white/8 text-white/70' : 'hover:bg-gray-50 text-gray-700'}`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        disabled={!!converting}
        className={btnClass}
        title="Download audio"
      >
        {converting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        {converting && <span>{converting === 'wav' ? 'Converting…' : 'Downloading…'}</span>}
        {!converting && <ChevronDown className="w-2.5 h-2.5" />}
      </button>

      {open && (
        <div className={menuClass} onClick={(e) => e.stopPropagation()}>
          <button onClick={downloadAsMp3} className={itemClass}>
            <Download className="w-3 h-3" /> Download as MP3
          </button>
          <button onClick={downloadAsWav} className={itemClass}>
            <Download className="w-3 h-3" /> Download as WAV
          </button>
          <button onClick={downloadOriginal} className={itemClass}>
            <Download className="w-3 h-3" /> Original format
          </button>
        </div>
      )}
    </div>
  );
}