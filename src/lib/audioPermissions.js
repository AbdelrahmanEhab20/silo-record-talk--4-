/**
 * Audio Permissions & Device Access
 * Manages permission state and device availability
 */

export const PERMISSION_STATE = {
  GRANTED: 'granted',
  DENIED: 'denied',
  PROMPT: 'prompt',
  CHECKING: 'checking',
  UNKNOWN: 'unknown'
};

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return { granted: true, error: null };
  } catch (error) {
    return { granted: false, error: error.message };
  }
}

/**
 * Check microphone permission state
 */
export async function checkMicrophonePermission() {
  try {
    if (typeof navigator === 'undefined') return PERMISSION_STATE.UNKNOWN;
    
    if (!navigator.permissions?.query) {
      return PERMISSION_STATE.UNKNOWN;
    }
    
    const result = await navigator.permissions.query({ name: 'microphone' });
    return result.state;
  } catch {
    return PERMISSION_STATE.UNKNOWN;
  }
}

/**
 * Check if screen recording is available
 */
export async function checkScreenRecordingAvailable() {
  try {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
  } catch {
    return false;
  }
}

/**
 * Get device info
 */
export async function getAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(d => d.kind === 'audioinput');
    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
    
    return {
      inputs: audioInputs,
      outputs: audioOutputs
    };
  } catch {
    return { inputs: [], outputs: [] };
  }
}

/**
 * Detect sound level (mock for demo)
 */
export function getSoundLevelBadge(level = 0) {
  if (level >= 0.7) return { badge: 'Excellent', color: 'text-green-400', bg: 'bg-green-400/10' };
  if (level >= 0.4) return { badge: 'Good', color: 'text-blue-400', bg: 'bg-blue-400/10' };
  if (level > 0) return { badge: 'Weak', color: 'text-amber-400', bg: 'bg-amber-400/10' };
  return { badge: 'No Sound', color: 'text-gray-400', bg: 'bg-gray-400/10' };
}