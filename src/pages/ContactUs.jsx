import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";

export default function ContactUs() {
  const { isDark } = useTheme();
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "", team_size: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const inputCls = isDark ? "bg-[#2C2C2E] border-white/10 text-white placeholder-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const sub = isDark ? "text-white/40" : "text-gray-400";
  const label = isDark ? "text-white/60" : "text-gray-600";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in all required fields.");
      return;
    }
    setError(null);
    setLoading(true);
    await base44.entities.Lead.create({ ...form, source: "contact_us", status: "new" });
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={`${bg} min-h-screen flex items-center justify-center px-5 pb-24`}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>We'll be in touch!</h2>
          <p className={`text-sm leading-relaxed ${sub}`}>Thanks for reaching out. Our team will contact you within 1 business day.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-6 py-2.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bg} min-h-screen pb-24`}>
      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => window.history.back()}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${isDark ? "bg-white/5 border-white/8 hover:bg-white/10" : "bg-white border-gray-200 hover:bg-gray-50"}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Contact Us</h1>
            <p className={`text-sm ${sub}`}>Enterprise plans & custom deployments</p>
          </div>
        </div>

        {/* Intro */}
        <div className={`${card} border rounded-2xl p-5 mb-6`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}>
              <span className="text-lg">🏢</span>
            </div>
            <div>
              <h2 className={`text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Enterprise & Custom Pricing</h2>
              <p className={`text-xs leading-relaxed ${sub}`}>White-label, on-premise deployment, SSO, custom AI models, and dedicated support. Let's talk.</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${label}`}>Full Name <span className="text-red-400">*</span></label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Sarah Johnson"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputCls}`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${label}`}>Work Email <span className="text-red-400">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="sarah@company.com"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputCls}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${label}`}>Company</label>
              <input
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Acme Corp"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputCls}`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${label}`}>Your Role</label>
              <input
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="Head of Operations"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputCls}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${label}`}>Team Size</label>
            <select
              value={form.team_size}
              onChange={e => setForm(f => ({ ...f, team_size: e.target.value }))}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputCls}`}
            >
              <option value="">Select team size</option>
              {["1-10", "11-50", "51-200", "201-500", "500+"].map(s => (
                <option key={s} value={s}>{s} people</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${label}`}>What are you looking for? <span className="text-red-400">*</span></label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Tell us about your use case, requirements, or questions..."
              rows={4}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm resize-none ${inputCls}`}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}