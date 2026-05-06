import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ElasticDragBehavior from './ElasticDragBehavior';
import { X } from 'lucide-react';

/**
 * ElasticDragExample — Demo of ElasticDragBehavior with bottom sheet behavior
 * Shows how to use the component in a real scenario
 */
export default function ElasticDragExample({ isOpen, onClose }) {
  const [snapIndex, setSnapIndex] = useState(0);

  if (!isOpen) return null;

  const snapPoints = [0, 150, 300]; // Three snap positions

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Elastic Draggable Sheet */}
          <ElasticDragBehavior
            axis="y"
            snapPoints={snapPoints}
            dismissThreshold={120}
            overscrollStrength={0.45}
            damping={0.78}
            stiffness={200}
            onDismiss={onClose}
            onSnapPoint={(point) => {
              setSnapIndex(snapPoints.indexOf(point));
            }}
            containerClass="fixed bottom-0 left-0 right-0 z-50"
            enableVisualFeedback={true}
          >
            {/* Sheet Content */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-t-3xl overflow-hidden shadow-2xl">
              {/* Drag Handle */}
              <div className="flex items-center justify-center py-3 bg-white dark:bg-[#2C2C2E]">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/20" />
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold dark:text-white">
                    Elastic Sheet
                  </h2>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4 dark:text-white" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-white/60">
                  Drag this sheet up, down, or release beyond the threshold to dismiss. Experience premium, tactile rubber-band physics with velocity-aware spring animation.
                </p>

                {/* Snap Position Indicator */}
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                    Snap Position: {snapIndex} / {snapPoints.length - 1}
                  </p>
                  <div className="flex gap-2">
                    {snapPoints.map((point, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          i === snapIndex
                            ? 'bg-purple-500'
                            : 'bg-purple-500/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="font-semibold dark:text-white">Features</h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-white/70">
                    <li>✨ Non-linear rubber-band resistance</li>
                    <li>⚡ Velocity-aware spring animation</li>
                    <li>📍 Configurable snap points</li>
                    <li>🎯 Dismiss threshold detection</li>
                    <li>🎨 Subtle visual feedback (scale + shadow)</li>
                    <li>♿ Smooth, natural feel without abrupt stops</li>
                  </ul>
                </div>

                <p className="text-xs text-gray-500 dark:text-white/40 pt-2">
                  Drag down beyond the bottom edge or swipe to dismiss. Try different snap points by dragging to specific positions.
                </p>
              </div>
            </div>
          </ElasticDragBehavior>
        </div>
      )}
    </AnimatePresence>
  );
}