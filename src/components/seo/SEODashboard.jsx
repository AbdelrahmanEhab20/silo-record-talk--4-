import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import { FileText, Target, TrendingUp, Globe, Loader2, ExternalLink, Trash2 } from "lucide-react";

export default function SEODashboard() {
  const { isDark } = useTheme();
  const [pages, setPages] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const sub = isDark ? "text-white/40" : "text-gray-400";

  useEffect(() => {
    Promise.all([
      appClient.entities.SEOPage.list("-created_date", 50),
      appClient.entities.Keyword.list("-priority_score", 50),
    ]).then(([p, k]) => {
      setPages(p);
      setKeywords(k);
      setLoading(false);
    });
  }, []);

  const deletePage = async (id) => {
    setDeleting(id);
    await appClient.entities.SEOPage.delete(id);
    setPages(prev => prev.filter(p => p.id !== id));
    setDeleting(null);
  };

  const totalEstTraffic = pages.reduce((s, p) => s + (p.estimated_traffic || 0), 0);
  const avgSeoScore = pages.length ? Math.round(pages.reduce((s, p) => s + (p.seo_score || 0), 0) / pages.filter(p => p.seo_score).length) || 0 : 0;
  const publishedCount = pages.filter(p => p.status === "published").length;
  const highValueKw = keywords.filter(k => k.conversion_potential === "high").length;

  const stats = [
    { label: "Total Pages", value: pages.length, icon: FileText, color: "text-purple-400", bg: "bg-purple-500/15" },
    { label: "Keywords Tracked", value: keywords.length, icon: Target, color: "text-blue-400", bg: "bg-blue-500/15" },
    { label: "Published", value: publishedCount, icon: Globe, color: "text-green-400", bg: "bg-green-500/15" },
    { label: "High-Value KW", value: highValueKw, icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-500/15" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className={`w-6 h-6 animate-spin ${sub}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${card} border rounded-2xl p-4`}>
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{value}</div>
            <div className={`text-xs ${sub} mt-0.5`}>{label}</div>
          </div>
        ))}
      </div>

      {/* Top Keywords */}
      {keywords.length > 0 && (
        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${sub}`}>Top Keywords by Priority</h3>
          <div className="space-y-2">
            {keywords.slice(0, 8).map((kw, i) => (
              <div key={kw.id} className="flex items-center gap-3">
                <span className={`text-xs font-bold ${sub} w-5`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{kw.keyword}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${kw.intent === "transactional" ? "bg-green-500/20 text-green-400" : kw.intent === "commercial" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}`}>{kw.intent}</span>
                  <span className="text-xs font-bold text-purple-400">{kw.priority_score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Pages */}
      {pages.length > 0 && (
        <div className={`${card} border rounded-2xl p-5`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${sub}`}>Page Library ({pages.length})</h3>
          <div className="space-y-3">
            {pages.map(page => (
              <div key={page.id} className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>{page.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                      page.status === "published" ? "bg-green-500/20 text-green-400" :
                      page.status === "draft" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>{page.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={sub}>{page.page_type}</span>
                    {page.target_keyword && <span className={sub}>🎯 {page.target_keyword}</span>}
                    {page.word_count && <span className={sub}>{page.word_count}w</span>}
                  </div>
                </div>
                <button
                  onClick={() => deletePage(page.id)}
                  disabled={deleting === page.id}
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isDark ? "hover:bg-red-500/15 text-white/20 hover:text-red-400" : "hover:bg-red-50 text-gray-300 hover:text-red-400"} transition-colors`}
                >
                  {deleting === page.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pages.length === 0 && keywords.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🚀</div>
          <div className={`text-sm font-medium ${isDark ? "text-white/60" : "text-gray-500"}`}>Start by researching keywords or generating content</div>
        </div>
      )}
    </div>
  );
}