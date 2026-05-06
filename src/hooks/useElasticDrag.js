import { useRef, useState, useCallback } from 'react';
import { useMotionValue, useTransform, useSpring } from 'framer-motion';

/**
 * useElasticDrag — iOS-style rubber-band drag physics hook
 * Provides velocity-aware spring animation with progressive overscroll resistance
 */
export function useElasticDrag({
  axis = 'y', // 'x' or 'y' or 'both'
  onSnapPoint = null, // callback when snapping to a point
  onDismiss = null, // callback when threshold exceeded
  snapPoints = [], // [0, 100, 300] — pixel positions to snap to
  dismissThreshold = 200, // pixels to trigger dismiss
  overscrollStrength = 0.65, // how much resistance during overscroll [0-1]
  damping = 0.85, // spring damping ratio
  stiffness = 150, // spring stiffness
  mass = 1.2, // spring mass
  maxOverscroll = 150, // max pixels to allow overscroll
} = {}) {
  const dragXMotion = useMotionValue(0);
  const dragYMotion = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragVelocity, setDragVelocity] = useState({ x: 0, y: 0 });
  const velocityTrackerRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, lastTime: 0 });

  // Spring configuration with custom physics
  const springConfig = {
    damping,
    stiffness,
    mass,
    restDelta: 0.001,
  };

  // Animated spring values that respond to drag motion values
  const springX = useSpring(dragXMotion, springConfig);
  const springY = useSpring(dragYMotion, springConfig);

  // Calculate rubber-band resistance using non-linear decay
  const calculateOverscrollResistance = useCallback((delta, maxDelta = maxOverscroll) => {
    if (delta === 0) return 0;
    const sign = Math.sign(delta);
    const absDelta = Math.abs(delta);
    if (absDelta <= maxDelta) return delta;
    // Non-linear: sqrt function for smooth decay
    const excess = absDelta - maxDelta;
    const resisted = maxDelta + Math.sqrt(excess) * overscrollStrength;
    return sign * resisted;
  }, [maxOverscroll, overscrollStrength]);

  // Update drag position with overscroll resistance
  const updateDragPosition = useCallback((x, y, vx, vy) => {
    if (axis === 'y' || axis === 'both') {
      const resistedY = calculateOverscrollResistance(y);
      dragYMotion.set(resistedY);
    }
    if (axis === 'x' || axis === 'both') {
      const resistedX = calculateOverscrollResistance(x);
      dragXMotion.set(resistedX);
    }
    setDragVelocity({ x: vx, y: vy });
  }, [axis, dragXMotion, dragYMotion, calculateOverscrollResistance]);

  // Handle drag start
  const handleDragStart = useCallback((e) => {
    setIsDragging(true);
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    velocityTrackerRef.current = {
      x: 0,
      y: 0,
      lastX: clientX,
      lastY: clientY,
      lastTime: Date.now(),
    };
  }, []);

  // Handle drag move
  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    const now = Date.now();
    const tracker = velocityTrackerRef.current;

    // Calculate velocity (px/ms, converted to px/s later)
    const dt = Math.max(now - tracker.lastTime, 16) / 1000; // in seconds
    const vx = (clientX - tracker.lastX) / dt;
    const vy = (clientY - tracker.lastY) / dt;

    // Store for later
    tracker.x = clientX - (e.target?.getBoundingClientRect?.().left || 0);
    tracker.y = clientY - (e.target?.getBoundingClientRect?.().top || 0);
    tracker.lastX = clientX;
    tracker.lastY = clientY;
    tracker.lastTime = now;

    // Update position — pass accumulated drag delta
    const dragX = axis !== 'y' ? (clientX - (e.currentTarget?.offsetLeft || 0)) : 0;
    const dragY = axis !== 'x' ? (clientY - (e.currentTarget?.offsetTop || 0)) : 0;

    updateDragPosition(dragX, dragY, vx, vy);
  }, [isDragging, axis, updateDragPosition]);

  // Handle drag end with snap-back logic
  const handleDragEnd = useCallback((e) => {
    setIsDragging(false);
    const tracker = velocityTrackerRef.current;
    const currentY = dragYMotion.get();
    const currentX = dragXMotion.get();

    // Check dismiss threshold
    if (
      onDismiss &&
      ((axis === 'y' && Math.abs(currentY) > dismissThreshold) ||
        (axis === 'x' && Math.abs(currentX) > dismissThreshold) ||
        (axis === 'both' &&
          Math.sqrt(currentX * currentX + currentY * currentY) > dismissThreshold))
    ) {
      onDismiss({ x: currentX, y: currentY, velocity: tracker });
      return;
    }

    // Find nearest snap point
    const relevantValue = axis === 'y' ? currentY : axis === 'x' ? currentX : currentY;
    if (snapPoints.length > 0) {
      const nearest = snapPoints.reduce((prev, curr) =>
        Math.abs(curr - relevantValue) < Math.abs(prev - relevantValue) ? curr : prev
      );
      if (onSnapPoint) onSnapPoint(nearest);
      if (axis === 'y' || axis === 'both') dragYMotion.set(nearest);
      if (axis === 'x' || axis === 'both') dragXMotion.set(nearest);
    } else {
      // Snap back to origin
      if (axis === 'y' || axis === 'both') dragYMotion.set(0);
      if (axis === 'x' || axis === 'both') dragXMotion.set(0);
    }
  }, [
    axis,
    snapPoints,
    dismissThreshold,
    dragXMotion,
    dragYMotion,
    onSnapPoint,
    onDismiss,
  ]);

  return {
    // Motion values for framer-motion
    dragXMotion,
    dragYMotion,
    springX,
    springY,
    // State
    isDragging,
    dragVelocity,
    // Event handlers
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    // Helper to get current position
    getCurrentPosition: () => ({
      x: dragXMotion.get(),
      y: dragYMotion.get(),
    }),
    // Helper to manually set position
    setPosition: (x, y) => {
      if (axis === 'y' || axis === 'both') dragYMotion.set(y);
      if (axis === 'x' || axis === 'both') dragXMotion.set(x);
    },
  };
}