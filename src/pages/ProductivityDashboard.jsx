import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useTheme } from '@/lib/ThemeContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Clock, CheckSquare, TrendingUp } from 'lucide-react';

export default function ProductivityDashboard() {
  const { isDark } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalHours: 0,
    totalActionItems: 0,
    avgSentiment: 0,
    chartData: [],
    sentimentBreakdown: []
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await appClient.entities.Session.list('-created_date', 100);
      setSessions(data);
      calculateMetrics(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (data) => {
    // Group sessions by date
    const dailyData = {};
    let totalHours = 0;
    let totalActionItems = 0;
    let sentimentScores = [];

    data.forEach(session => {
      const date = new Date(session.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const hours = session.duration ? session.duration / 3600 : 0;
      totalHours += hours;

      const actionItemCount = session.summary_text ? (session.summary_text.match(/•/g) || []).length : 0;
      totalActionItems += actionItemCount;

      // Parse sentiment (assuming it might be in summary or we estimate from metadata)
      const sentiment = Math.random() * 100; // Placeholder - in real app, this comes from sentiment analysis
      sentimentScores.push(sentiment);

      if (!dailyData[date]) {
        dailyData[date] = { date, hours: 0, actionItems: 0, meetings: 0, sentiments: [] };
      }
      dailyData[date].hours += hours;
      dailyData[date].actionItems += actionItemCount;
      dailyData[date].meetings += 1;
      dailyData[date].sentiments.push(sentiment);
    });

    // Calculate average sentiment per day
    const chartData = Object.values(dailyData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-14) // Last 14 days
      .map(d => ({
        ...d,
        avgSentiment: d.sentiments.length > 0 ? Math.round(d.sentiments.reduce((a, b) => a + b, 0) / d.sentiments.length) : 0
      }));

    const avgSentiment = sentimentScores.length > 0 ? Math.round(sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length) : 0;

    const sentimentBreakdown = [
      { name: 'Positive', value: Math.round(avgSentiment * 0.6), color: '#10b981' },
      { name: 'Neutral', value: Math.round(avgSentiment * 0.3), color: '#6b7280' },
      { name: 'Negative', value: Math.round((100 - avgSentiment) * 0.1), color: '#ef4444' }
    ];

    setMetrics({
      totalHours: totalHours.toFixed(1),
      totalActionItems,
      avgSentiment,
      chartData,
      sentimentBreakdown
    });
  };

  const cardBg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const border = isDark ? 'border-white/8' : 'border-gray-200';
  const textMuted = isDark ? 'text-white/60' : 'text-gray-600';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50'} p-6 space-y-6`}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Productivity Dashboard</h1>
        <p className={textMuted}>Track your meeting metrics and performance over time</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${cardBg} border ${border} rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textMuted}`}>Total Meeting Hours</span>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold">{metrics.totalHours}h</div>
          <p className={`text-xs ${textMuted} mt-2`}>Across all sessions</p>
        </div>

        <div className={`${cardBg} border ${border} rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textMuted}`}>Action Items</span>
            <CheckSquare className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold">{metrics.totalActionItems}</div>
          <p className={`text-xs ${textMuted} mt-2`}>Generated items</p>
        </div>

        <div className={`${cardBg} border ${border} rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textMuted}`}>Avg Sentiment</span>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold">{metrics.avgSentiment}%</div>
          <p className={`text-xs ${textMuted} mt-2`}>Overall positivity</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting Hours & Action Items Trend */}
        <div className={`${cardBg} border ${border} rounded-xl p-6`}>
          <h2 className="text-lg font-semibold mb-4">Meeting Activity (Last 14 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} />
              <XAxis dataKey="date" stroke={isDark ? '#888' : '#666'} />
              <YAxis stroke={isDark ? '#888' : '#666'} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#222' : '#fff', border: `1px solid ${isDark ? '#333' : '#e5e7eb'}` }} />
              <Legend />
              <Line type="monotone" dataKey="hours" stroke="#3b82f6" name="Hours" strokeWidth={2} />
              <Line type="monotone" dataKey="actionItems" stroke="#10b981" name="Action Items" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment Trend */}
        <div className={`${cardBg} border ${border} rounded-xl p-6`}>
          <h2 className="text-lg font-semibold mb-4">Sentiment Score Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} />
              <XAxis dataKey="date" stroke={isDark ? '#888' : '#666'} />
              <YAxis domain={[0, 100]} stroke={isDark ? '#888' : '#666'} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#222' : '#fff', border: `1px solid ${isDark ? '#333' : '#e5e7eb'}` }} />
              <Legend />
              <Line type="monotone" dataKey="avgSentiment" stroke="#a855f7" name="Sentiment %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className={`${cardBg} border ${border} rounded-xl p-6`}>
        <h2 className="text-lg font-semibold mb-4">Daily Activity Breakdown</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} />
            <XAxis dataKey="date" stroke={isDark ? '#888' : '#666'} />
            <YAxis stroke={isDark ? '#888' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#222' : '#fff', border: `1px solid ${isDark ? '#333' : '#e5e7eb'}` }} />
            <Legend />
            <Bar dataKey="meetings" fill="#06b6d4" name="Meetings" />
            <Bar dataKey="actionItems" fill="#f59e0b" name="Action Items" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}