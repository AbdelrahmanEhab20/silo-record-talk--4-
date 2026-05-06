import React, { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const { isDark } = useTheme();
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(null);
  const pulling = useRef(false);

  const onTouchStart = (e) => {
    const scrollContainer = containerRef.current?.scrollParent || window;
    const scrollTop = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  };

  const onTouchMove = (e) => {
    if (!pulling.current || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && dy < 150) {
      setPullY(Math.min(dy * 0.45, THRESHOLD));
    }
  };

  const onTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullY >= THRESHOLD - 4) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPullY(0);
  };

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        touchAction: pullY > 0 ? "none" : "auto",
        WebkitOverflowScrolling: "touch"
      }}
    >
      {/* Indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullY }}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-white/10" : "bg-gray-100"}`}
          style={{ opacity: progress, transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 180}deg)` }}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}