import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { detectPlatform, getSupportLevel, PLATFORMS } from '@/lib/audioCapabilities';
import { checkMicrophonePermission, requestMicrophonePermission, checkScreenRecordingAvailable, PERMISSION_STATE } from '@/lib/audioPermissions';
import { CheckCircle2, AlertCircle, ChevronDown, Zap, Mic, Monitor, Settings } from 'lucide-react';

export default function DeviceSetupAssistant({ onClose }) {
  const { isDark } = useTheme();
  const [platform, setPlatform] = useState(null);
  const [support, setSupport] = useState(null);
  const [permissions, setPermissions] = useState({
    microphone: PERMISSION_STATE.CHECKING,
    screenRecording: null
  });
  const [expandedSteps, setExpandedSteps] = useState({});

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    setSupport(getSupportLevel(p));
    
    checkMicrophonePermission().then(state => {
      setPermissions(prev => ({ ...prev, microphone: state }));
    });
    
    checkScreenRecordingAvailable().then(available => {
      setPermissions(prev => ({ ...prev, screenRecording: available }));
    });
  }, []);

  if (!support) return null;

  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]';
  const card = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const border = isDark ? 'border-white/8' : 'border-gray-100';
  const textSub = isDark ? 'text-white/40' : 'text-gray-400';

  const getPermissionIcon = (state) => {
    if (state === PERMISSION_STATE.GRANTED) return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    if (state === PERMISSION_STATE.DENIED) return <AlertCircle className="w-5 h-5 text-red-400" />;
    return <AlertCircle className="w-5 h-5 text-amber-400" />;
  };

  const getPermissionText = (state) => {
    if (state === PERMISSION_STATE.GRANTED) return 'Granted';
    if (state === PERMISSION_STATE.DENIED) return 'Denied';
    return 'Needs Permission';
  };

  const setupStepsForPlatform = {
    [PLATFORMS.WINDOWS]: [
      {
        title: 'Enable System Audio Loopback',
        description: 'Windows allows system audio capture natively via Stereo Mix or virtual audio devices.',
        steps: [
          'Right-click speaker icon → Sound settings',
          'Under "Recording", check for "Stereo Mix" or "What U Hear"',
          'If not visible: Device Manager → Audio devices → Right-click device → Enable'
        ]
      },
      {
        title: 'Grant Microphone Permission',
        description: 'SILO needs microphone access for mixed audio capture.',
        steps: [
          'Settings → Privacy → Microphone',
          'Ensure SILO is enabled',
          'Restart SILO if needed'
        ]
      }
    ],
    [PLATFORMS.MACOS]: [
      {
        title: 'Install Audio Capture Driver',
        description: 'macOS requires a system extension or virtual audio driver for internal audio.',
        steps: [
          'SILO will guide you to install BlackHole or SoundFlower',
          'Grant system extension permission when prompted',
          'Restart if needed'
        ]
      },
      {
        title: 'Grant Microphone Permission',
        description: 'Allow SILO microphone access.',
        steps: [
          'System Settings → Privacy & Security → Microphone',
          'Find SILO and enable it',
          'Restart SILO'
        ]
      },
      {
        title: 'Grant Screen Recording Permission',
        description: 'Optional: for screen recording with audio.',
        steps: [
          'System Settings → Privacy & Security → Screen Recording',
          'Enable SILO'
        ]
      }
    ],
    [PLATFORMS.ANDROID]: [
      {
        title: 'Grant Microphone Permission',
        description: 'Required for any audio capture.',
        steps: [
          'Settings → Apps → SILO → Permissions',
          'Enable "Microphone"'
        ]
      },
      {
        title: 'Enable Screen Recording (Optional)',
        description: 'For capturing app audio directly.',
        steps: [
          'This requires Android 10+ and specific app cooperation',
          'SILO will request when needed'
        ]
      }
    ],
    [PLATFORMS.IOS]: [
      {
        title: 'Grant Microphone Permission',
        description: 'Required for audio recording.',
        steps: [
          'Settings → SILO → Microphone → Enable'
        ]
      }
    ]
  };

  const steps = setupStepsForPlatform[platform] || [];

  return (
    <div className={`${bg} min-h-screen py-8 px-5 pb-24`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Audio Setup Assistant</h1>
          <p className={`text-sm ${textSub}`}>Configure your device for internal audio capture</p>
        </div>

        {/* Device Info */}
        <div className={`${card} rounded-2xl border ${border} p-6 mb-6`}>
          <h2 className="text-sm font-semibold mb-4">Your Device</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textSub}`}>Platform</span>
              <span className="text-sm font-medium capitalize">{platform}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textSub}`}>Support Level</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                support.level === 'full' ? 'bg-green-400/20 text-green-300' :
                support.level === 'partial' ? 'bg-blue-400/20 text-blue-300' :
                'bg-amber-400/20 text-amber-300'
              }`}>
                {support.level.charAt(0).toUpperCase() + support.level.slice(1)} Support
              </span>
            </div>
            <div className="flex items-start justify-between">
              <span className={`text-sm ${textSub}`}>Description</span>
              <span className="text-sm text-right">{support.description}</span>
            </div>
          </div>
        </div>

        {/* Permission Status */}
        <div className={`${card} rounded-2xl border ${border} p-6 mb-6`}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Permissions
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4" />
                <span className="text-sm font-medium">Microphone</span>
              </div>
              <div className="flex items-center gap-2">
                {getPermissionIcon(permissions.microphone)}
                <span className={`text-xs ${textSub}`}>{getPermissionText(permissions.microphone)}</span>
              </div>
            </div>
            {permissions.screenRecording !== null && (
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4" />
                  <span className="text-sm font-medium">Screen Recording</span>
                </div>
                <div className="flex items-center gap-2">
                  {getPermissionIcon(permissions.screenRecording ? PERMISSION_STATE.GRANTED : PERMISSION_STATE.PROMPT)}
                  <span className={`text-xs ${textSub}`}>{permissions.screenRecording ? 'Available' : 'Not Available'}</span>
                </div>
              </div>
            )}
          </div>
          {permissions.microphone !== PERMISSION_STATE.GRANTED && (
            <button
              onClick={() => requestMicrophonePermission().then(() => {
                setPermissions(prev => ({ ...prev, microphone: PERMISSION_STATE.GRANTED }));
              })}
              className="w-full mt-4 py-2 px-3 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
            >
              Grant Microphone Permission
            </button>
          )}
        </div>

        {/* Setup Steps */}
        <div className={`${card} rounded-2xl border ${border} p-6 mb-6`}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Setup Steps
          </h2>
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx} className="border border-white/5 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                  className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                >
                  <div className="text-left">
                    <h3 className="text-sm font-medium">{step.title}</h3>
                    <p className={`text-xs ${textSub} mt-1`}>{step.description}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 ${textSub} transition-transform ${expandedSteps[idx] ? 'rotate-180' : ''}`} />
                </button>
                {expandedSteps[idx] && (
                  <div className={`px-3 py-3 border-t border-white/5 ${isDark ? 'bg-white/2' : 'bg-gray-50'}`}>
                    <ol className="space-y-2">
                      {step.steps.map((s, i) => (
                        <li key={i} className={`text-xs flex gap-2 ${textSub}`}>
                          <span className="font-semibold shrink-0">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
              isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            Back
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Continue to Recording
          </button>
        </div>
      </div>
    </div>
  );
}