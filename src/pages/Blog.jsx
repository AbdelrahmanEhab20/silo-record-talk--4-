import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/lib/ThemeContext";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, Ear, Mic, Brain, Zap, CheckCircle, FileText, BarChart2, Share2, Star, ChevronRight } from "lucide-react";

const ARTICLES = [
  {
    id: 1,
    slug: "best-ai-note-taking-apps-2024",
    tag: "Comparison",
    tagColor: "bg-blue-500/20 text-blue-400",
    readTime: "6 min read",
    date: "April 2, 2025",
    title: "The Best AI Note-Taking Apps in 2025: A Deep Dive",
    subtitle: "We tested every major AI notes app — here's why Silo comes out on top for meeting accuracy and speed.",
    cover: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&q=80",
    heroAlt: "Person taking notes on a laptop in a meeting",
    sections: [
      {
        heading: "The landscape of AI note-taking in 2025",
        body: "AI note-taking has exploded over the past two years. Tools like Otter.ai, Fireflies.ai, Notion AI, and Silo AI are all competing for meeting rooms and remote workspaces. But not all of them are built equally — especially when it comes to real accuracy, speed, and language support.",
      },
      {
        heading: "What we tested",
        body: "We ran 50+ hours of real meeting recordings through each tool. Criteria included transcription accuracy (word error rate), time-to-summary, multilingual support, action item detection, and cost per minute.",
        visual: {
          type: "comparison",
          rows: [
            { label: "Transcription Accuracy", silo: "97%", otter: "89%", fireflies: "84%", notion: "81%" },
            { label: "Time to Summary", silo: "~3s", otter: "~45s", fireflies: "~2min", notion: "Manual" },
            { label: "Arabic Support", silo: "✅ Dialects", otter: "❌", fireflies: "Partial", notion: "❌" },
            { label: "Live Transcript", silo: "✅", otter: "✅", fireflies: "❌", notion: "❌" },
            { label: "Action Items AI", silo: "✅ Auto", otter: "Paid", fireflies: "✅", notion: "Manual" },
          ]
        }
      },
      {
        heading: "Why Silo outperforms the competition",
        body: "Silo's edge is its real-time pipeline. While other tools record first and transcribe later, Silo's engine streams speech recognition live — you see words appear as they're spoken. Combined with Whisper-powered fallback for accuracy, it achieves a near-perfect word error rate even in noisy environments.",
        visual: {
          type: "screenshot",
          src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
          caption: "Real-time transcript appearing as words are spoken"
        }
      },
      {
        heading: "Verdict",
        body: "If you need speed, accuracy, and multilingual support — especially for Arabic — Silo is the clear winner. Its free tier alone offers more functionality than the paid tiers of competing tools.",
      }
    ]
  },
  {
    id: 2,
    slug: "silo-ai-features-deep-dive",
    tag: "Deep Dive",
    tagColor: "bg-purple-500/20 text-purple-400",
    readTime: "8 min read",
    date: "March 28, 2025",
    title: "Inside Silo AI: 7 Features That Make It the Smartest Notes App",
    subtitle: "From live transcription to AI-powered summaries and Arabic dialect detection — here's everything Silo does that others can't.",
    cover: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80",
    heroAlt: "AI powered technology visualization",
    sections: [
      {
        heading: "1. Live Real-Time Transcription",
        body: "Unlike most apps that transcribe after the meeting, Silo starts transcribing the moment you hit record. Words appear on screen with zero noticeable delay, giving you a live feed of your entire conversation.",
        visual: {
          type: "feature-card",
          icon: "mic",
          label: "Live Transcript",
          desc: "Words appear in real-time as they're spoken — no waiting, no post-processing."
        }
      },
      {
        heading: "2. Arabic Dialect Detection",
        body: "Silo is one of the only apps in the world that detects specific Arabic dialects — Egyptian, Gulf, Levantine, and more. It adapts its language model accordingly, dramatically improving accuracy for Arabic-speaking teams.",
        visual: {
          type: "feature-card",
          icon: "brain",
          label: "Dialect Intelligence",
          desc: "Detects Egyptian, Gulf, Levantine, and other Arabic dialects automatically."
        }
      },
      {
        heading: "3. Instant AI Summaries",
        body: "As soon as a session ends, Silo's AI generates a clean bullet-point summary with decisions made, action items, and key takeaways — in under 5 seconds. No manual editing required.",
        visual: {
          type: "screenshot",
          src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
          caption: "AI-generated summary with action items extracted automatically"
        }
      },
      {
        heading: "4. Internal Audio + Microphone Capture",
        body: "Silo captures not just your microphone but also internal device audio — meaning remote meeting participants are recorded too. This sets it apart from basic mic-only recorders.",
        visual: {
          type: "feature-card",
          icon: "zap",
          label: "Dual Audio Mode",
          desc: "Captures your mic AND remote speakers from Zoom, Teams, Google Meet simultaneously."
        }
      },
      {
        heading: "5. Sentiment & Engagement Analytics",
        body: "Silo's analytics dashboard tracks meeting sentiment over time, identifies friction points, and shows participation trends. You can literally see which meetings energized your team and which ones drained it.",
        visual: {
          type: "screenshot",
          src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
          caption: "Meeting analytics showing sentiment trends and participation data"
        }
      },
      {
        heading: "6. Export Studio",
        body: "Export your meeting as a polished DOCX, PDF, or shareable link. Choose from templates like Executive Brief, Action Plan, or Full Minutes — all styled and ready to send.",
        visual: {
          type: "feature-card",
          icon: "file",
          label: "Export Studio",
          desc: "One-click export to DOCX, PDF, or shareable link with professional templates."
        }
      },
      {
        heading: "7. Ask Silo Anything",
        body: "After a meeting, ask Silo AI questions about what was discussed — 'What was decided about the Q3 budget?' or 'Who owns the marketing deliverable?' It answers instantly from the transcript.",
        visual: {
          type: "feature-card",
          icon: "brain",
          label: "Ask Silo",
          desc: "Query your entire meeting transcript with natural language questions."
        }
      }
    ]
  },
  {
    id: 3,
    slug: "stop-taking-meeting-notes-manually",
    tag: "Productivity",
    tagColor: "bg-green-500/20 text-green-400",
    readTime: "5 min read",
    date: "March 20, 2025",
    title: "Stop Taking Meeting Notes Manually — Let AI Do It Better",
    subtitle: "Manual note-taking is costing your team 5+ hours a week. Here's the smarter approach with Silo AI.",
    cover: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800&q=80",
    heroAlt: "Productive team in a meeting room",
    sections: [
      {
        heading: "The hidden cost of manual notes",
        body: "Research shows that professionals spend an average of 5.6 hours per week in meetings. Of that, nearly 20% is spent on note-taking — that's over an hour every single week just capturing what's being said, not thinking about it.",
        visual: {
          type: "stat",
          stats: [
            { value: "5.6h", label: "Hours/week in meetings" },
            { value: "20%", label: "Time spent note-taking" },
            { value: "$4,200", label: "Avg annual cost per employee" }
          ]
        }
      },
      {
        heading: "The problem with human note-takers",
        body: "Manual notes are incomplete by nature. You can't write and think at the same time. Studies show humans capture less than 40% of what's said in a meeting. Action items get missed. Decisions go undocumented. And different people remember different things.",
      },
      {
        heading: "What Silo does instead",
        body: "Silo captures 100% of what's said, verbatim — then uses AI to distill it into what actually matters. You get: a full transcript, a structured summary, extracted action items with owners, and a searchable record of every decision ever made in your meetings.",
        visual: {
          type: "screenshot",
          src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80",
          caption: "Silo's session detail view with transcript, summary, and action items"
        }
      },
      {
        heading: "The workflow shift",
        body: "With Silo, meeting participants can actually be present — engaged, thinking, contributing. The AI handles the documentation. After the meeting, everyone gets a shared summary link automatically. No more 'can you share your notes?' emails.",
        visual: {
          type: "feature-card",
          icon: "share",
          label: "Auto-Share",
          desc: "Silo automatically generates a shared summary link for all participants after each meeting."
        }
      },
      {
        heading: "Start free today",
        body: "Silo offers 30 minutes of free recording daily — no credit card required. That's enough to transform your next team standup, 1:1, or client call. Try it once and you'll never go back to manual notes.",
      }
    ]
  }
];

function FeatureCardVisual({ icon, label, desc, isDark }) {
  const icons = {
    mic: <Mic className="w-5 h-5 text-purple-400" />,
    brain: <Brain className="w-5 h-5 text-purple-400" />,
    zap: <Zap className="w-5 h-5 text-purple-400" />,
    file: <FileText className="w-5 h-5 text-purple-400" />,
    share: <Share2 className="w-5 h-5 text-purple-400" />,
    bar: <BarChart2 className="w-5 h-5 text-purple-400" />,
  };
  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 my-4 ${isDark ? 'bg-purple-500/5 border-purple-500/20' : 'bg-purple-50 border-purple-200'}`}>
      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
        {icons[icon] || <Zap className="w-5 h-5 text-purple-400" />}
      </div>
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{desc}</p>
      </div>
    </div>
  );
}

function ComparisonTable({ rows, isDark }) {
  return (
    <div className={`rounded-2xl border overflow-hidden my-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
      <div className={`grid grid-cols-5 text-xs font-bold px-3 py-2 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
        <span className="col-span-1">Feature</span>
        <span className="text-center text-purple-400">Silo</span>
        <span className={`text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Otter</span>
        <span className={`text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Fireflies</span>
        <span className={`text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Notion</span>
      </div>
      {rows.map((row, i) => (
        <div key={i} className={`grid grid-cols-5 text-xs px-3 py-2.5 border-t ${isDark ? 'border-white/5' : 'border-gray-100'} ${i % 2 === 0 ? '' : isDark ? 'bg-white/2' : 'bg-gray-50/50'}`}>
          <span className={`col-span-1 font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>{row.label}</span>
          <span className="text-center font-semibold text-purple-400">{row.silo}</span>
          <span className={`text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{row.otter}</span>
          <span className={`text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{row.fireflies}</span>
          <span className={`text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{row.notion}</span>
        </div>
      ))}
    </div>
  );
}

function StatRow({ stats, isDark }) {
  return (
    <div className="grid grid-cols-3 gap-3 my-4">
      {stats.map((s, i) => (
        <div key={i} className={`rounded-2xl border p-4 text-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
          <p className="text-2xl font-bold text-purple-400">{s.value}</p>
          <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function ArticleView({ article, isDark, onBack }) {
  const navigate = useNavigate();
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-white/55' : 'text-gray-500';
  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]';

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className={`${bg} min-h-screen pb-24`}
    >
      <div className="max-w-lg mx-auto px-5">
        {/* Back */}
        <div className="pt-6 pb-4">
          <button onClick={onBack} className={`flex items-center gap-2 text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}>
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </button>
        </div>

        {/* Tag + Meta */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${article.tagColor}`}>{article.tag}</span>
          <span className={`text-xs ${textSub}`}>{article.date}</span>
          <span className={`text-xs ${textSub}`}>·</span>
          <span className={`text-xs flex items-center gap-1 ${textSub}`}><Clock className="w-3 h-3" />{article.readTime}</span>
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-bold leading-snug mb-3 ${textMain}`}>{article.title}</h1>
        <p className={`text-base leading-relaxed mb-6 ${textSub}`}>{article.subtitle}</p>

        {/* Cover Image */}
        <div className="rounded-2xl overflow-hidden mb-8 aspect-video">
          <img src={article.cover} alt={article.heroAlt} className="w-full h-full object-cover" />
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {article.sections.map((section, i) => (
            <div key={i}>
              <h2 className={`text-lg font-bold mb-3 ${textMain}`}>{section.heading}</h2>
              <p className={`text-sm leading-relaxed ${textSub}`}>{section.body}</p>
              {section.visual?.type === 'comparison' && <ComparisonTable rows={section.visual.rows} isDark={isDark} />}
              {section.visual?.type === 'feature-card' && <FeatureCardVisual {...section.visual} isDark={isDark} />}
              {section.visual?.type === 'stat' && <StatRow stats={section.visual.stats} isDark={isDark} />}
              {section.visual?.type === 'screenshot' && (
                <div className="my-4 rounded-2xl overflow-hidden border border-purple-500/20">
                  <img src={section.visual.src} alt={section.visual.caption} className="w-full object-cover max-h-48" />
                  <p className={`text-xs text-center py-2 px-3 ${isDark ? 'text-white/40 bg-white/3' : 'text-gray-400 bg-gray-50'}`}>{section.visual.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`mt-12 p-6 rounded-3xl text-center ${isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}>
            <Ear className="w-6 h-6 text-white" />
          </div>
          <h3 className={`font-bold text-lg mb-2 ${textMain}`}>Try Silo for Free</h3>
          <p className={`text-sm mb-4 ${textSub}`}>30 minutes daily, no credit card required.</p>
          <button
            onClick={() => navigate("/home")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Blog() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [activeArticle, setActiveArticle] = useState(null);

  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-white/50' : 'text-gray-500';
  const cardBg = isDark ? 'bg-[#1C1C1E] border-white/8' : 'bg-white border-gray-200';

  if (activeArticle) {
    return <ArticleView article={activeArticle} isDark={isDark} onBack={() => setActiveArticle(null)} />;
  }

  return (
    <div className={`${bg} min-h-screen pb-24`}>
      <div className="max-w-lg mx-auto px-5">
        {/* Header */}
        <div className="pt-8 pb-6 flex items-center justify-between">
          <button onClick={() => navigate("/")} className={`flex items-center gap-2 text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}>
              <Ear className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">Silo Blog</span>
          </div>
        </div>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 mb-3 inline-block`}>Resources & Insights</span>
          <h1 className={`text-3xl font-bold leading-tight mb-3 ${textMain}`}>The AI Notes<br />Knowledge Hub</h1>
          <p className={`text-sm leading-relaxed ${textSub}`}>Guides, comparisons, and deep dives on AI-powered meeting notes — and why Silo leads the pack.</p>
        </motion.div>

        {/* Featured Article */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${textSub}`}>Featured</p>
          <button
            onClick={() => setActiveArticle(ARTICLES[0])}
            className={`w-full text-left rounded-3xl border overflow-hidden transition-all active:scale-[0.98] hover:border-purple-400/50 ${cardBg}`}
          >
            <div className="aspect-video overflow-hidden">
              <img src={ARTICLES[0].cover} alt={ARTICLES[0].heroAlt} className="w-full h-full object-cover" />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ARTICLES[0].tagColor}`}>{ARTICLES[0].tag}</span>
                <span className={`text-xs flex items-center gap-1 ${textSub}`}><Clock className="w-3 h-3" />{ARTICLES[0].readTime}</span>
              </div>
              <h2 className={`font-bold text-lg leading-snug mb-2 ${textMain}`}>{ARTICLES[0].title}</h2>
              <p className={`text-sm leading-relaxed ${textSub}`}>{ARTICLES[0].subtitle}</p>
              <div className="flex items-center gap-1 mt-4 text-purple-400 text-sm font-semibold">
                Read article <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        </motion.div>

        {/* Other Articles */}
        <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${textSub}`}>More Articles</p>
        <div className="space-y-4">
          {ARTICLES.slice(1).map((article, i) => (
            <motion.button
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              onClick={() => setActiveArticle(article)}
              className={`w-full text-left rounded-2xl border p-4 flex gap-4 transition-all active:scale-[0.98] hover:border-purple-400/50 ${cardBg}`}
            >
              <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0">
                <img src={article.cover} alt={article.heroAlt} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${article.tagColor}`}>{article.tag}</span>
                  <span className={`text-xs flex items-center gap-1 ${textSub}`}><Clock className="w-3 h-3" />{article.readTime}</span>
                </div>
                <h3 className={`font-semibold text-sm leading-snug line-clamp-2 ${textMain}`}>{article.title}</h3>
                <p className={`text-xs mt-1 line-clamp-2 ${textSub}`}>{article.subtitle}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={`mt-12 p-6 rounded-3xl text-center ${isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}
        >
          <p className={`font-bold text-base mb-1 ${textMain}`}>Ready to experience Silo?</p>
          <p className={`text-sm mb-4 ${textSub}`}>Free to start. No credit card needed.</p>
          <button
            onClick={() => navigate("/home")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
          >
            Try Silo Free <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}