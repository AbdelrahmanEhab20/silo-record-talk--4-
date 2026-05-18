import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { Mic, Zap, BarChart2, ArrowRight, CheckCircle, Brain, FileText, Share2, Ear, Check, Building2, BookOpen, Clock, Upload, Video, ImageIcon, FileCode, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const { isDark } = useTheme();

  const handleGetStarted = async () => {
    appClient.auth.redirectToLogin("/home");
  };

  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-[#A1A1A6]' : 'text-gray-500';
  const cardBg = isDark ? 'bg-white/5 border-white/8' : 'bg-white border-gray-200';
  const accentBg = isDark ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-200';

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className={`min-h-screen ${bg} ${textMain} transition-colors duration-300`}>
      <div className="max-w-lg mx-auto px-5">
        {/* Header with App Name & Icon */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pt-8 pb-8 flex flex-col items-center gap-4 justify-center"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1, #22D3EE)" }}
          >
            <Ear className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Silo</h1>
            <p className="text-xs text-[#A1A1A6] font-medium">AI Notes</p>
          </div>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-16 mt-8"
        >
          <h2 className="text-4xl font-bold mb-4 tracking-tight leading-tight">
            Transform Meetings into Intelligence
          </h2>
          <p className={`text-lg ${textSub} leading-relaxed mb-10`}>
            Capture every word, summarize instantly, and never miss actionable insights from your meetings.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-[15px] font-semibold text-white shadow-lg transition-all active:scale-95 min-h-[56px] hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #A855F7, #6366F1, #22D3EE)",
              boxShadow: "0 8px 32px rgba(139, 92, 246, 0.4)"
            }}
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* How It Works - Animated Flow */}
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold mb-8 text-center">How It Works</h3>
          <div className="space-y-4">
            {[
              { icon: Upload, title: "Capture", desc: "Record live, upload files, or paste content" },
              { icon: Brain, title: "AI Processes", desc: "Transcribe, analyze, and extract insights in real-time" },
              { icon: FileText, title: "Auto-Summarize", desc: "Get instant summaries, action items & decisions" },
              { icon: BarChart2, title: "Share & Track", desc: "Export insights and collaborate with your team" }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                variants={item}
                className={`${cardBg} border rounded-2xl p-5 flex items-start gap-4`}
              >
                <motion.div
                  className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0"
                  whileHover={{ scale: 1.1 }}
                >
                  <step.icon className="w-5 h-5 text-purple-400" />
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-400">0{idx + 1}</span>
                    <h4 className="font-semibold">{step.title}</h4>
                  </div>
                  <p className={`text-sm ${textSub} mt-1`}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Input Methods - New Section */}
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold mb-8 text-center">Multiple Ways to Capture</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Mic, title: "Live Record", desc: "Real-time transcription" },
              { icon: Upload, title: "Audio Files", desc: "MP3, WAV, M4A" },
              { icon: Video, title: "Video URLs", desc: "YouTube, links" },
              { icon: ImageIcon, title: "Images", desc: "Handwritten notes" },
              { icon: FileCode, title: "Text Paste", desc: "Any document" },
              { icon: FileText, title: "Meeting Notes", desc: "Quick jot-down" }
            ].map(({ icon: Icon, title, desc }, idx) => (
              <motion.div
                key={idx}
                variants={item}
                className={`${cardBg} border rounded-xl p-4 text-center transition-all hover:border-purple-400/50`}
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>
                <h4 className="font-semibold text-sm mb-0.5">{title}</h4>
                <p className={`text-xs ${textSub}`}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Key Features */}
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold mb-8 text-center">Powerful Features</h3>
          <div className="space-y-3">
            {[
              {
                icon: Upload,
                title: "Flexible Inputs",
                desc: "Record live, upload audio files, video URLs, images of notes, or paste text directly"
              },
              {
                icon: Zap,
                title: "AI-Powered Analysis",
                desc: "Automatic transcription, summaries, action items, decisions & intelligent insights in real-time"
              },
              {
                icon: Brain,
                title: "Smart Meeting Assistant",
                desc: "Silo AI listens and creates real-time notes, highlights key insights during recording"
              },
              {
                icon: Share2,
                title: "Easy Sharing & Export",
                desc: "Share transcripts, summaries, and action items with your team effortlessly"
              }
            ].map(({ icon: Icon, title, desc }, idx) => (
              <motion.div
                key={idx}
                variants={item}
                className={`${cardBg} border rounded-2xl p-4 transition-all hover:border-purple-400/50`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-semibold text-[15px] mb-1">{title}</h4>
                    <p className={`text-sm ${textSub}`}>{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Benefits */}
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className={`${accentBg} border rounded-2xl p-6 mb-16`}
        >
          <h3 className="text-xl font-bold mb-6 text-center">Why Choose Silo?</h3>
          <div className="space-y-4">
            {[
              "Never miss important details from meetings again",
              "Save hours on manual note-taking every week",
              "Identify action items automatically",
              "Build searchable library of all your meetings",
              "Track decisions and follow-ups effortlessly"
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                variants={item}
                className="flex items-start gap-3"
              >
                <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className={`text-[15px] leading-relaxed ${textMain}`}>{benefit}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Enterprise / standalone */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-80px" }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold mb-2 text-center">Built for organizations</h3>
          <p className={`text-center ${textSub} mb-6 max-w-md mx-auto`}>
            Deploy Silo for your government agency or company. Usage is tracked per user — no consumer billing or Stripe.
          </p>
          <div className={`${cardBg} border rounded-3xl p-6 space-y-4`}>
            {[
              "Per-user minute tracking for compliance and capacity planning",
              "Organization admin dashboard (users & usage) — coming soon",
              "On-premise or private cloud deployment options",
              "Data sovereignty, SSO, and access control ready",
            ].map((line, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className={`text-[15px] leading-relaxed ${textMain}`}>{line}</p>
              </div>
            ))}
            <button
              type="button"
              onClick={() => (window.location.href = "/ContactUs")}
              className="w-full py-3 rounded-2xl font-semibold text-sm border transition-all"
              style={{ borderColor: isDark ? "#3A3A3C" : "#E8E8ED", color: isDark ? "#fff" : "#000" }}
            >
              Contact us for deployment
            </button>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Meetings?</h3>
          <p className={`${textSub} mb-6`}>Join teams that are already saving hours every week</p>
          <button
            onClick={handleGetStarted}
            className="w-full px-6 py-4 rounded-full text-[15px] font-semibold text-white transition-all active:scale-95 min-h-[56px]"
            style={{
              background: "linear-gradient(135deg, #A855F7, #6366F1, #22D3EE)",
              boxShadow: "0 8px 32px rgba(139, 92, 246, 0.4)"
            }}
          >
            Get Started
          </button>
        </motion.section>

        {/* Blog Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">From the Blog</h3>
            <button
              onClick={() => window.location.href = '/Blog'}
              className="flex items-center gap-1 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { tag: "Comparison", tagColor: "bg-blue-500/20 text-blue-400", title: "The Best AI Note-Taking Apps in 2025: A Deep Dive", time: "6 min", img: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=400&q=80" },
              { tag: "Deep Dive", tagColor: "bg-purple-500/20 text-purple-400", title: "Inside Silo AI: 7 Features That Make It the Smartest Notes App", time: "8 min", img: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&q=80" },
              { tag: "Productivity", tagColor: "bg-green-500/20 text-green-400", title: "Stop Taking Meeting Notes Manually — Let AI Do It Better", time: "5 min", img: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400&q=80" }
            ].map((post, i) => (
              <button
                key={i}
                onClick={() => window.location.href = '/Blog'}
                className={`w-full text-left ${cardBg} border rounded-2xl p-3 flex gap-3 transition-all hover:border-purple-400/50 active:scale-[0.98]`}
              >
                <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={post.img} alt={post.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${post.tagColor}`}>{post.tag}</span>
                    <span className={`text-[10px] flex items-center gap-1 ${textSub}`}><Clock className="w-2.5 h-2.5" />{post.time} read</span>
                  </div>
                  <p className={`text-xs font-semibold leading-snug line-clamp-2 ${textMain}`}>{post.title}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className={`text-center py-12 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}
        >
          <p className="text-sm font-semibold mb-2">Silo AI Notes</p>
          <p className={`text-xs ${textSub}`}>Intelligent meeting capture and insights</p>

          <div className="flex justify-center gap-5 mt-5">
            <a href="/privacy" className={`text-xs ${textSub} hover:text-white transition-colors underline underline-offset-2`}>Privacy Policy</a>
            <a href="/terms" className={`text-xs ${textSub} hover:text-white transition-colors underline underline-offset-2`}>Terms of Service</a>
            <a href="/support" className={`text-xs ${textSub} hover:text-white transition-colors underline underline-offset-2`}>Support</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

