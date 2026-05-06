/**
 * Audio Capabilities Detection
 * Detects platform, OS, and available audio capture modes
 */

export const PLATFORMS = {
  WINDOWS: 'windows',
  MACOS: 'macos',
  ANDROID: 'android',
  IOS: 'ios',
  UNKNOWN: 'unknown'
};

export const SUPPORT_LEVELS = {
  FULL: 'full',      // Full internal audio support
  PARTIAL: 'partial', // Some internal audio with limitations
  LIMITED: 'limited', // Microphone or screen capture only
  NONE: 'none'       // No capture support
};

export const AUDIO_MODES = {
  INTERNAL: 'internal',
  MICROPHONE: 'microphone',
  INTERNAL_MIC: 'internal_mic',
  SCREEN_AUDIO: 'screen_audio'
};

export const SUPPORT_STATUS = {
  READY: 'ready',
  NEEDS_SETUP: 'needs_setup',
  LIMITED_SUPPORT: 'limited_support'
};

/**
 * Detect current platform
 */
export function detectPlatform() {
  if (typeof navigator === 'undefined') return PLATFORMS.UNKNOWN;
  
  const ua = navigator.userAgent.toLowerCase();
  const hasTouch = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;

  // Explicit mobile UA checks
  if (ua.includes('android')) return PLATFORMS.ANDROID;
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return PLATFORMS.IOS;

  // iPad on iOS 13+ reports as 'Macintosh' — detect via touch support
  if ((ua.includes('mac') || ua.includes('darwin')) && hasTouch) return PLATFORMS.IOS;

  // Windows desktop
  if (ua.includes('win')) return PLATFORMS.WINDOWS;

  // macOS desktop (no touch)
  if (ua.includes('mac') || ua.includes('darwin')) return PLATFORMS.MACOS;

  // Any remaining touch device (Android TV, etc.) treat as mobile
  if (hasTouch) return PLATFORMS.ANDROID;

  return PLATFORMS.UNKNOWN;
}

/**
 * Get support level for current platform
 */
export function getSupportLevel(platform = detectPlatform()) {
  const supportMap = {
    [PLATFORMS.WINDOWS]: {
      level: SUPPORT_LEVELS.FULL,
      modes: [AUDIO_MODES.INTERNAL, AUDIO_MODES.MICROPHONE, AUDIO_MODES.INTERNAL_MIC],
      description: 'Full internal audio capture via system loopback',
      needsSetup: false,
      setupSteps: []
    },
    [PLATFORMS.MACOS]: {
      level: SUPPORT_LEVELS.PARTIAL,
      modes: [AUDIO_MODES.INTERNAL, AUDIO_MODES.MICROPHONE, AUDIO_MODES.INTERNAL_MIC],
      description: 'Internal audio capture available (may require setup)',
      needsSetup: true,
      setupSteps: [
        'Install system audio capture driver',
        'Grant microphone permission',
        'Allow screen recording (for some apps)'
      ]
    },
    [PLATFORMS.ANDROID]: {
      level: SUPPORT_LEVELS.PARTIAL,
      modes: [AUDIO_MODES.INTERNAL, AUDIO_MODES.MICROPHONE, AUDIO_MODES.SCREEN_AUDIO],
      description: 'Internal audio subject to app/OS permissions',
      needsSetup: false,
      setupSteps: []
    },
    [PLATFORMS.IOS]: {
      level: SUPPORT_LEVELS.LIMITED,
      modes: [AUDIO_MODES.MICROPHONE, AUDIO_MODES.SCREEN_AUDIO],
      description: 'Microphone or screen recording with audio',
      needsSetup: false,
      setupSteps: []
    }
  };
  
  return supportMap[platform] || {
    level: SUPPORT_LEVELS.NONE,
    modes: [AUDIO_MODES.MICROPHONE],
    description: 'Limited audio capture support',
    needsSetup: false,
    setupSteps: []
  };
}

/**
 * Check if mode is supported on platform
 */
export function isModeSupported(mode, platform = detectPlatform()) {
  const support = getSupportLevel(platform);
  return support.modes.includes(mode);
}

/**
 * Get available audio sources for platform
 */
export function getAvailableAudioSources(platform = detectPlatform()) {
  const sourceMap = {
    [PLATFORMS.WINDOWS]: [
      { id: 'speaker', label: 'Speaker Output', icon: '🔊', priority: 1 },
      { id: 'system', label: 'System Audio', icon: '💻', priority: 2 },
      { id: 'microphone', label: 'Microphone', icon: '🎤', priority: 3 }
    ],
    [PLATFORMS.MACOS]: [
      { id: 'internal', label: 'Internal Audio', icon: '🎧', priority: 1 },
      { id: 'microphone', label: 'Built-in Microphone', icon: '🎤', priority: 2 }
    ],
    [PLATFORMS.ANDROID]: [
      { id: 'internal', label: 'App Audio', icon: '🎵', priority: 1 },
      { id: 'microphone', label: 'Microphone', icon: '🎤', priority: 2 }
    ],
    [PLATFORMS.IOS]: [
      { id: 'microphone', label: 'Microphone', icon: '🎤', priority: 1 }
    ]
  };
  
  return (sourceMap[platform] || sourceMap[PLATFORMS.IOS]).sort((a, b) => a.priority - b.priority);
}

/**
 * Get recommended mode for platform
 */
export function getRecommendedMode(platform = detectPlatform()) {
  const support = getSupportLevel(platform);

  // On mobile, default to microphone — internal audio is not reliably available
  if (isMobile(platform)) return AUDIO_MODES.MICROPHONE;

  // INTERNAL_MIC is best for desktop meetings: captures both remote speakers + your voice
  if (support.modes.includes(AUDIO_MODES.INTERNAL_MIC)) return AUDIO_MODES.INTERNAL_MIC;
  if (support.modes.includes(AUDIO_MODES.INTERNAL)) return AUDIO_MODES.INTERNAL;
  if (support.modes.includes(AUDIO_MODES.MICROPHONE)) return AUDIO_MODES.MICROPHONE;

  return AUDIO_MODES.SCREEN_AUDIO;
}

/**
 * Get mode description
 */
export function getModeDescription(mode) {
  const descriptions = {
    [AUDIO_MODES.INTERNAL]: 'Captures remote speakers only — not your voice',
    [AUDIO_MODES.MICROPHONE]: 'Captures your voice only — not remote speakers',
    [AUDIO_MODES.INTERNAL_MIC]: '⭐ Best for meetings — captures both your voice and remote speakers',
    [AUDIO_MODES.SCREEN_AUDIO]: 'Record screen with audio (best for demos)'
  };
  return descriptions[mode] || 'Select audio capture mode';
}

/**
 * Check if platform is mobile
 */
export function isMobile(platform = detectPlatform()) {
  return [PLATFORMS.IOS, PLATFORMS.ANDROID].includes(platform);
}

/**
 * Check if platform is desktop
 */
export function isDesktop(platform = detectPlatform()) {
  return [PLATFORMS.WINDOWS, PLATFORMS.MACOS].includes(platform);
}