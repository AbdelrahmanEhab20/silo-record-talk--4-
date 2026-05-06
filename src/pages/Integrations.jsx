import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/lib/ThemeContext';
import { ChevronLeft, Video, ExternalLink, CheckCircle, Copy, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const FUNCTION_BASE = `${window.location.origin}/api/functions`;

export default function Integrations() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(null);

  const bg = isDark ? '#000000' : '#F5F5F7';
  const card = isDark ? '#1C1C1E' : '#FFFFFF';
  const text = isDark ? '#FFFFFF' : '#000000';
  const sub = isDark ? '#A1A1A6' : '#6E6E73';
  const border = isDark ? '#2C2C2E' : '#E8E8ED';

  const copyUrl = async (key, url) => {
    await navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const integrations = [
    {
      id: 'zoom',
      name: 'Zoom',
      color: '#2D8CFF',
      icon: '🔵',
      webhookUrl: `${FUNCTION_BASE}/zoomWebhook`,
      steps: [
        { text: 'Go to', link: 'https://marketplace.zoom.us', linkText: 'marketplace.zoom.us' },
        { text: 'Build App → Zoom App type (for in-meeting tab)' },
        { text: 'Set your app URL to your Silo app URL (loads as iframe inside Zoom)' },
        { text: 'Under "Event Subscriptions", add the webhook URL below' },
        { text: 'Subscribe to the', code: 'recording.completed', text2: 'event' },
        { text: 'Copy the "Secret Token" → add to Silo secrets as', code: 'ZOOM_WEBHOOK_SECRET_TOKEN' },
        { text: 'Request OAuth scopes:', code: 'meeting:read recording:read user:read' },
        { text: 'Submit app for Zoom Marketplace review' },
      ]
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      color: '#6264A7',
      icon: '🟣',
      webhookUrl: `${FUNCTION_BASE}/teamsWebhook`,
      steps: [
        { text: 'Go to', link: 'https://portal.azure.com', linkText: 'portal.azure.com' },
        { text: 'Azure AD → App registrations → New registration' },
        { text: 'Add API permissions:', code: 'OnlineMeetings.Read CallRecords.Read.All User.Read' },
        { text: 'Go to', link: 'https://dev.teams.microsoft.com', linkText: 'Teams Developer Portal' },
        { text: 'Create app → Add a Tab → set URL to your Silo app URL' },
        { text: 'Register a Graph webhook subscription pointing to the URL below' },
        { text: 'Set', code: 'clientState', text2: 'to your access token when creating the subscription' },
        { text: 'Package and submit to Microsoft AppSource' },
      ]
    }
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: bg }}>
      {/* Nav */}
      <div className="sticky top-0 z-50 border-b" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(245,245,247,0.85)', borderColor: border, backdropFilter: 'blur(20px)' }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-colors" style={{ backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', color: text }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: text }}>Integrations</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <p className="text-sm" style={{ color: sub }}>
          Connect Silo to your video conferencing platforms to auto-record, transcribe, and surface meeting intelligence directly inside Zoom and MS Teams.
        </p>

        {integrations.map(integration => (
          <div key={integration.id} className="rounded-3xl border overflow-hidden" style={{ backgroundColor: card, borderColor: border }}>
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b flex items-center gap-3" style={{ borderColor: border }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${integration.color}20` }}>
                {integration.icon}
              </div>
              <div>
                <h2 className="font-bold text-base" style={{ color: text }}>{integration.name}</h2>
                <p className="text-xs" style={{ color: sub }}>Tab app · Meeting details · Auto-transcribe</p>
              </div>
            </div>

            {/* Webhook URL */}
            <div className="px-5 py-4 border-b" style={{ borderColor: border }}>
              <p className="text-xs font-semibold mb-2" style={{ color: sub }}>WEBHOOK ENDPOINT URL</p>
              <div className="flex items-center gap-2 rounded-xl p-3" style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}>
                <code className="text-xs flex-1 break-all" style={{ color: text }}>{integration.webhookUrl}</code>
                <button onClick={() => copyUrl(integration.id, integration.webhookUrl)} className="flex-shrink-0 p-1.5 rounded-lg transition-all" style={{ backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA', color: text }}>
                  {copied === integration.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: sub }}>Paste this URL in the platform's webhook / event subscription settings.</p>
            </div>

            {/* Setup steps */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold mb-3" style={{ color: sub }}>SETUP GUIDE</p>
              <ol className="space-y-2.5">
                {integration.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-xs font-bold mt-0.5 w-4 flex-shrink-0" style={{ color: integration.color }}>{i + 1}</span>
                    <p className="text-sm leading-relaxed" style={{ color: sub }}>
                      {step.text}{' '}
                      {step.link && <a href={step.link} target="_blank" rel="noreferrer" className="underline font-medium" style={{ color: integration.color }}>{step.linkText} <ExternalLink className="inline w-3 h-3" /></a>}
                      {step.code && <code className="px-1.5 py-0.5 rounded text-xs mx-0.5" style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: text }}>{step.code}</code>}
                      {step.text2 && ` ${step.text2}`}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ))}

        <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: isDark ? '#1C2A1C' : '#F0FDF4', color: isDark ? '#86EFAC' : '#166534' }}>
          <p className="font-semibold mb-1">💡 How it works end-to-end</p>
          <p className="text-xs leading-relaxed opacity-90">
            When a meeting ends, Zoom/Teams sends a webhook to Silo. Silo downloads the recording, transcribes it via OpenAI Whisper, and automatically saves it as a session in your dashboard — including attendees, duration, and AI-generated summaries.
          </p>
        </div>
      </div>
    </div>
  );
}