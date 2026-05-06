import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { Ear, MessageCircle, ChevronDown, CheckCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FAQS = [
  {
    q: "How do I start recording a meeting?",
    a: "Tap the microphone button on the main screen. Choose your audio source (Microphone, Internal Audio, or Internal + Mic) and tap to start recording."
  },
  {
    q: "What languages does Silo support?",
    a: "Silo supports English and Arabic, including multiple Arabic dialects. Language is auto-detected during transcription."
  },
  {
    q: "How many minutes do I get on the free plan?",
    a: "Free users get 30 minutes per day. You can earn extra minutes by watching ads. Pro users get 1,800 minutes per month."
  },
  {
    q: "Can I upload an existing audio or video file?",
    a: "Yes! On the Recording screen, expand 'Other Options' to upload an audio file, paste a video URL, upload an image of notes, or paste text directly."
  },
  {
    q: "How do I share a session with my team?",
    a: "Open any session and tap the Share button. You can create a public share link or share it to a workspace."
  },
  {
    q: "How do I cancel my Pro subscription?",
    a: "Go to Settings → Subscription and tap 'Manage Subscription'. You can cancel anytime and your access continues until the end of the billing period."
  },
  {
    q: "Is my data private and secure?",
    a: "Yes. Your recordings and transcripts are stored securely and are only accessible to you. We never share your data with third parties. See our Privacy Policy for details."
  }
];

export default function Support() {
  const { isDark } = useTheme();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/50" : "text-gray-500";
  const cardBg = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const inputClass = isDark
    ? "bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500/60 focus:outline-none rounded-xl px-4 py-3 w-full text-sm"
    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:outline-none rounded-xl px-4 py-3 w-full text-sm";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setSubmitting(true);
    await appClient.entities.SupportRequest.create(form);
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className={`min-h-screen ${bg} ${textMain} transition-colors duration-300`}>
      <div className="max-w-lg mx-auto px-5 pb-16">

        {/* Header */}
        <div className="pt-8 pb-6 flex flex-col items-center gap-3">
          <a href="/" className={`self-start flex items-center gap-1.5 text-sm ${textSub} hover:text-purple-400 transition-colors mb-2`}>
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </a>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1, #22D3EE)" }}
          >
            <Ear className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className={`text-sm text-center ${textSub}`}>We're here to help. Browse the FAQ or send us a message.</p>
        </div>

        {/* FAQ Section */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-400" /> Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq, idx) => (
              <div key={idx} className={`rounded-2xl border ${cardBg} overflow-hidden`}>
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-4 py-4 text-left gap-3"
                >
                  <span className={`text-sm font-medium ${textMain}`}>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openFaq === idx ? "rotate-180 text-purple-400" : textSub}`} />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className={`px-4 pb-4 text-sm leading-relaxed ${textSub}`}>{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section>
          <h2 className="text-lg font-bold mb-4">Contact Us</h2>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl border ${cardBg} p-8 flex flex-col items-center gap-3 text-center`}
            >
              <CheckCircle className="w-10 h-10 text-green-400" />
              <h3 className="font-semibold text-base">Message Sent!</h3>
              <p className={`text-sm ${textSub}`}>Thanks for reaching out. We'll get back to you at <strong>{form.email}</strong> as soon as possible.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className={`rounded-2xl border ${cardBg} p-5 space-y-4`}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${textSub} block mb-1.5`}>Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${textSub} block mb-1.5`}>Email</label>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold ${textSub} block mb-1.5`}>Subject</label>
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select a topic…</option>
                  {["General Question", "Bug Report", "Billing Issue", "Feature Request", "Account Issue", "Other"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-xs font-semibold ${textSub} block mb-1.5`}>Message</label>
                <textarea
                  placeholder="Describe your issue or question in detail…"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={5}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
              >
                {submitting ? "Sending…" : "Send Message"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}