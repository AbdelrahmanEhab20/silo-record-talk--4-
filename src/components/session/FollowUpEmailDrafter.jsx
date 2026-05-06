import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Mail, Send, Eye, ArrowLeft, Check, ExternalLink, ChevronDown } from "lucide-react";

// Known mail app URL schemes for mobile deep linking
const MAIL_APPS = [
  {
    name: "Default Mail",
    icon: "📧",
    scheme: (to, subject, body) => `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    always: true, // always show
  },
  {
    name: "Gmail",
    icon: "📨",
    scheme: (to, subject, body) => `googlegmail://co?to=${to}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  },
  {
    name: "Outlook",
    icon: "📬",
    scheme: (to, subject, body) => `ms-outlook://compose?to=${to}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  },
  {
    name: "Spark",
    icon: "⚡",
    scheme: (to, subject, body) => `readdle-spark://compose?recipient=${to}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  },
  {
    name: "Apple Mail",
    icon: "🍎",
    scheme: (to, subject, body) => `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    iosOnly: true,
  },
];

function MailAppPicker({ email, isDark, onClose }) {
  const border = isDark ? "border-white/10" : "border-gray-200";
  const card = isDark ? "bg-[#2C2C2E]" : "bg-white";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;

  const apps = MAIL_APPS.filter(app => {
    if (app.iosOnly && !isIOS) return false;
    if (!app.always && !isMobile) return false;
    return true;
  });

  const open = (app) => {
    const url = app.scheme(email.recipient, email.subject, email.body);
    window.open(url, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className={`${card} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm border ${border} shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`px-5 pt-5 pb-3 border-b ${border}`}>
          <p className="font-semibold text-sm">Open in Mail App</p>
          <p className={`text-xs mt-0.5 ${textSub} truncate`}>To: {email.recipient_name} &lt;{email.recipient}&gt;</p>
        </div>
        <div className="py-2">
          {apps.map((app) => (
            <button
              key={app.name}
              onClick={() => open(app)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 text-sm transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
            >
              <span className="text-xl">{app.icon}</span>
              <span className="font-medium">{app.name}</span>
              <ExternalLink className={`w-3.5 h-3.5 ml-auto ${textSub}`} />
            </button>
          ))}
        </div>
        <div className={`px-5 pb-5 pt-2 border-t ${border}`}>
          <button onClick={onClose}
            className={`w-full py-3 rounded-2xl text-sm font-medium border transition-colors ${isDark ? "border-white/10 text-white/50 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-800"}`}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FollowUpEmailDrafter({ session, onClose }) {
  const { isDark } = useTheme();
  const [draftEmails, setDraftEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentList, setSentList] = useState(new Set());
  const [previewIdx, setPreviewIdx] = useState(null);
  const [error, setError] = useState(null);
  const [mailPickerEmail, setMailPickerEmail] = useState(null); // email object to open in app

  useEffect(() => {
    if (session) generateEmails();
  }, [session]);

  const extractParticipants = () => {
    const participants = new Set();
    if (session.calendar_attendees?.length > 0) {
      session.calendar_attendees.forEach(a => {
        const email = a.match(/[^\s<>]+@[^\s<>]+/)?.[0];
        if (email) participants.add(email);
      });
    }
    if (participants.size === 0 && session.transcript_text) {
      const speakerMatch = session.transcript_text.match(/\[[\d:]+\]\s*([^:]+):/g);
      if (speakerMatch) {
        speakerMatch.forEach(m => {
          const name = m.match(/\]\s*([^:]+):/)?.[1]?.trim();
          if (name && !name.includes("[") && name.length > 2) participants.add(name);
        });
      }
    }
    return Array.from(participants).slice(0, 10);
  };

  const extractActionItems = () => {
    if (!session.summary_text) return [];
    try {
      const data = typeof session.summary_text === "string" ? JSON.parse(session.summary_text) : session.summary_text;
      return (data.action_items || []).map(a => ({
        task: a.task, owner: a.owner || "Unassigned",
        deadline: a.deadline || "TBD", priority: a.priority || "Medium"
      }));
    } catch { return []; }
  };

  const generateEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const participants = extractParticipants();
      const actionItems = extractActionItems();
      if (participants.length === 0) {
        setError("No participants found. Add calendar attendees or check transcript.");
        setLoading(false);
        return;
      }
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate personalized follow-up emails for a meeting. Create one email per participant.

Meeting: ${session.title}
Date: ${new Date(session.created_date).toLocaleDateString()}
Summary: ${session.summary_text?.substring(0, 500) || "Meeting completed"}
Participants: ${participants.join(", ")}
Action Items: ${actionItems.map((a, i) => `${i + 1}. ${a.task} — Owner: ${a.owner}, Deadline: ${a.deadline}, Priority: ${a.priority}`).join("\n")}

Each email should: personalize the greeting, summarize key points, list relevant action items with deadlines, end professionally.
Return ONLY valid JSON:
{"emails":[{"recipient":"email or name","recipient_name":"First Name","subject":"subject line","body":"full plain text email body"}]}`,
        response_json_schema: {
          type: "object",
          properties: {
            emails: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recipient: { type: "string" },
                  recipient_name: { type: "string" },
                  subject: { type: "string" },
                  body: { type: "string" }
                }
              }
            }
          }
        }
      });
      setDraftEmails(result.emails || []);
    } catch (e) {
      setError("Failed to generate emails. Please try again.");
    }
    setLoading(false);
  };

  // Open the default mailto: link (for list view "quick send")
  const openMailto = (email) => {
    const url = `mailto:${email.recipient}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.open(url, "_blank");
    setSentList(prev => new Set([...prev, draftEmails.indexOf(email)]));
  };

  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/8" : "border-gray-100";
  const inputBg = isDark ? "bg-white/5 border-white/8" : "bg-gray-50 border-gray-200";

  const previewEmail = previewIdx !== null ? draftEmails[previewIdx] : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
        <div className={`${card} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border ${border} shadow-2xl`}>

          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-4 border-b ${isDark ? "border-white/8" : "border-gray-100"}`}>
            {previewIdx !== null ? (
              <button onClick={() => setPreviewIdx(null)} className={`flex items-center gap-2 text-sm ${isDark ? "text-white/60 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold">Follow-up Emails</span>
              </div>
            )}
            <button onClick={onClose} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "bg-white/8 text-white/40 hover:text-white" : "bg-gray-100 text-gray-400 hover:text-gray-700"}`}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                <p className={`text-xs ${textSub}`}>Drafting personalized emails…</p>
              </div>
            )}

            {error && !loading && (
              <div className={`rounded-lg p-4 ${isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"}`}>
                <p className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>{error}</p>
                <button onClick={generateEmails} className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-100 text-red-600 hover:bg-red-200"}`}>
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && draftEmails.length === 0 && (
              <div className={`rounded-lg p-6 text-center ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className={`text-sm ${textSub}`}>No emails generated</p>
              </div>
            )}

            {/* Preview Mode */}
            {previewEmail && (
              <div className="space-y-4">
                <div>
                  <label className={`text-xs font-semibold ${textSub} block mb-1.5`}>To</label>
                  <input type="text" value={`${previewEmail.recipient_name} <${previewEmail.recipient}>`} readOnly
                    className={`w-full px-3 py-2 rounded-lg text-xs border ${inputBg} outline-none`} />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${textSub} block mb-1.5`}>Subject</label>
                  <input type="text" value={previewEmail.subject} readOnly
                    className={`w-full px-3 py-2 rounded-lg text-xs border ${inputBg} outline-none`} />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${textSub} block mb-1.5`}>Message</label>
                  <textarea value={previewEmail.body} readOnly
                    className={`w-full px-3 py-2 rounded-lg text-xs border ${inputBg} outline-none resize-none h-52`} />
                </div>
              </div>
            )}

            {/* List Mode */}
            {previewIdx === null && draftEmails.length > 0 && (
              <div className="space-y-2">
                {draftEmails.map((email, i) => (
                  <div key={i} className={`rounded-xl p-3 border transition-colors ${isDark ? "bg-white/3 border-white/8 hover:bg-white/5" : "bg-gray-50 border-gray-200 hover:bg-white"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{email.recipient_name}</p>
                        <p className={`text-xs ${textSub} truncate`}>{email.recipient}</p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        {sentList.has(i) && <Check className="w-4 h-4 text-green-400" />}
                        <button onClick={() => setPreviewIdx(i)}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? "bg-white/8 text-white/50 hover:text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}
                          title="Preview">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setMailPickerEmail(email)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                          title="Open in mail app"
                        >
                          <Send className="w-3 h-3" />
                          <span className="hidden sm:inline">Open</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && !error && draftEmails.length > 0 && previewIdx === null && (
            <div className={`flex items-center gap-3 px-4 py-4 border-t ${isDark ? "border-white/8" : "border-gray-100"}`}>
              <p className={`text-xs ${textSub}`}>{sentList.size}/{draftEmails.length} opened</p>
              <button
                onClick={() => draftEmails.forEach(e => setMailPickerEmail(e))}
                className="ml-auto px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" /> Open All Drafts
              </button>
            </div>
          )}

          {/* Preview footer */}
          {previewEmail && (
            <div className={`flex items-center gap-2 px-4 py-4 border-t ${isDark ? "border-white/8" : "border-gray-100"}`}>
              <button
                onClick={() => openMailto(previewEmail)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${isDark ? "border-white/10 text-white/60 hover:text-white hover:border-white/20" : "border-gray-200 text-gray-600 hover:text-gray-900"}`}
              >
                <ExternalLink className="w-4 h-4" /> Quick Open (Default)
              </button>
              <button
                onClick={() => setMailPickerEmail(previewEmail)}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" /> Choose Mail App
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mail App Picker Sheet */}
      {mailPickerEmail && (
        <MailAppPicker
          email={mailPickerEmail}
          isDark={isDark}
          onClose={() => setMailPickerEmail(null)}
        />
      )}
    </>
  );
}