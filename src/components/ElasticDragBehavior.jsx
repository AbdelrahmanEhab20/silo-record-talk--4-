import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useElasticDrag } from '@/hooks/useElasticDrag';

/**
 * ElasticDragBehavior — Reusable iOS-style rubber-band drag component
 * Wraps content with elastic drag physics, snap points, and dismiss behavior
 * 
 * Usage:
 * <ElasticDragBehavior
 *   axis="y"
 *   snapPoints={[0, 300]}
 *   dismissThreshold={150}
 *   onDismiss={() => setOpen(false)}
 * >
 *   <YourContent />
 * </ElasticDragBehavior>
 */
export default function ElasticDragBehavior({
  children,
  axis = 'y',
  snapPoints = [],
  dismissThreshold = 200,
  overscrollStrength = 0.45,
  damping = 0.78,
  stiffness = 200,
  mass = 1,
  maxOverscroll = 150,
  onSnapPoint = null,
  onDismiss = null,
  containerClass = '',
  enableVisualFeedback = true,
}) {
  const containerRef = useRef(null);

  const {
    dragXMotion,
    dragYMotion,
    springX,
    springY,
    isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    getCurrentPosition,
  } = useElasticDrag({
    axis,
    snapPoints,
    dismissThreshold,
    overscrollStrength,
    damping,
    stiffness,
    mass,
    maxOverscroll,
    onSnapPoint,
    onDismiss,
  });

  // Calculate visual feedback intensity
  const dragMagnitude = () => {
    const pos = getCurrentPosition();
    return Math.sqrt(pos.x * pos.x + pos.y * pos.y);
  };

  // Add event listeners to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('pointerdown', handleDragStart);
    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handleDragEnd);
    window.addEventListener('pointercancel', handleDragEnd);

    return () => {
      container.removeEventListener('pointerdown', handleDragStart);
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handleDragEnd);
      window.removeEventListener('pointercancel', handleDragEnd);
    };
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // Calculate scale and shadow feedback
  const scaleIntensity = isDragging ? Math.min(dragMagnitude() / 200, 0.05) : 0;
  const shadowIntensity = isDragging ? Math.min(dragMagnitude() / 150, 1) : 0;

  return (
    <motion.div
      ref={containerRef}
      style={{
        x: axis === 'x' || axis === 'both' ? springX : 0,
        y: axis === 'y' || axis === 'both' ? springY : 0,
        scale: enableVisualFeedback ? 1 - scaleIntensity * 0.02 : 1,
        boxShadow: enableVisualFeedback
          ? `0 ${8 + shadowIntensity * 12}px ${16 + shadowIntensity * 8}px rgba(0, 0, 0, ${0.08 + shadowIntensity * 0.12})`
          : 'none',
      }}
      className={`${containerClass} transition-shadow`}
      initial={{ scale: 1 }}
    >
      {/* Drag indicator hint during drag */}
      {isDragging && enableVisualFeedback && (
        <div className="absolute inset-0 pointer-events-none rounded-2xl border border-purple-500/20" />
      )}
      {children}
    </motion.div>
  );
}