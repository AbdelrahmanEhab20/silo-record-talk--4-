import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { Play, Pause, Volume2, Maximize2, FastForward } from "lucide-react";

export default function VideoPlayer({ videoUrl }) {
  const { isDark } = useTheme();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  if (!videoUrl) return null;

  const isYouTube = /youtube\.com|youtu\.be/.test(videoUrl);
  const isVimeo = /vimeo\.com/.test(videoUrl);

  // Extract YouTube video ID from various URL formats
  const getYouTubeId = (url) => {
    try {
      const urlObj = new URL(url);
      // youtube.com/watch?v=...
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      }
      // youtu.be/...
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      }
    } catch (e) {
      // Fallback regex for malformed URLs
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  // Extract Vimeo video ID
  const getVimeoId = (url) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  };

  // Video event handlers
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
    }
  };

  const handlePictureInPicture = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (e) {
        console.error("PiP error:", e);
      }
    }
  };

  const handleTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime);
  };

  const handleLoadedMetadata = (e) => {
    setDuration(e.target.duration);
  };

  const handleProgressBarClick = (e) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * duration;
    }
  };

  const formatTime = (time) => {
    if (!isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  // YouTube and Vimeo iframes don't support custom controls, render as-is
  if ((isYouTube || isVimeo) && ((isYouTube && getYouTubeId(videoUrl)) || (isVimeo && getVimeoId(videoUrl)))) {
    return (
      <div className="mb-8">
        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/8' : 'bg-white border-gray-200'}`}>
          <div className={`aspect-video ${isDark ? 'bg-black/30' : 'bg-gray-100'} flex items-center justify-center`}>
            {isYouTube && getYouTubeId(videoUrl) && (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${getYouTubeId(videoUrl)}`}
                title="Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            )}
            {isVimeo && getVimeoId(videoUrl) && (
              <iframe
                src={`https://player.vimeo.com/video/${getVimeoId(videoUrl)}`}
                width="100%"
                height="100%"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Custom HTML5 video player with enhanced controls
  return (
    <div className="mb-8">
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/8' : 'bg-white border-gray-200'}`}>
        <div className={`aspect-video ${isDark ? 'bg-black/50' : 'bg-gray-100'} relative group`}>
          <video
            ref={videoRef}
            width="100%"
            height="100%"
            className="w-full h-full"
            src={videoUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          >
            Your browser does not support the video tag.
          </video>

          {/* Custom Controls Overlay */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
            {/* Progress Bar */}
            <div
              className={`w-full h-1 rounded-full cursor-pointer mb-4 ${isDark ? 'bg-white/20' : 'bg-white/30'}`}
              onClick={handleProgressBarClick}
            >
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
            </div>

            {/* Time Display + Controls */}
            <div className="flex items-center justify-between gap-3">
              {/* Left: Play/Pause + Time */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayPause}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/30 hover:bg-white/40 text-gray-900'}`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <span className="text-xs font-semibold text-white whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right: Speed + PiP + Fullscreen */}
              <div className="flex items-center gap-2">
                {/* Speed Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-xs font-semibold ${isDark ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/30 hover:bg-white/40 text-gray-900'}`}
                  >
                    {playbackSpeed}x
                  </button>
                  {showSpeedMenu && (
                    <div className={`absolute bottom-full right-0 mb-2 rounded-lg border ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-gray-200'} shadow-lg z-10`}>
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`block w-full px-3 py-1.5 text-xs text-left transition-colors ${
                            playbackSpeed === speed
                              ? isDark ? 'bg-purple-500/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                              : isDark ? 'hover:bg-white/5 text-white/70' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Picture in Picture */}
                {document.pictureInPictureEnabled && (
                  <button
                    onClick={handlePictureInPicture}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/30 hover:bg-white/40 text-gray-900'}`}
                    title="Picture in Picture"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}

                {/* Fullscreen */}
                <button
                  onClick={() => videoRef.current?.requestFullscreen?.()}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/30 hover:bg-white/40 text-gray-900'}`}
                  title="Fullscreen"
                >
                  <FastForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}