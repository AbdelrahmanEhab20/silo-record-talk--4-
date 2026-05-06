import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { folder_name, session_ids } = body;
    if (!folder_name) return Response.json({ error: 'folder_name required' }, { status: 400 });

    // Fetch all sessions in folder
    const allSessions = await base44.entities.Session.filter({ user_email: user.email, folder: folder_name });
    let sessions = allSessions.filter(s => !s.is_subsession);

    // If specific session IDs provided, filter to only those
    if (session_ids && Array.isArray(session_ids) && session_ids.length > 0) {
      const idSet = new Set(session_ids);
      sessions = sessions.filter(s => idSet.has(s.id));
    }

    if (sessions.length === 0) {
      return Response.json({ error: 'No sessions found in this folder' }, { status: 404 });
    }

    // Build combined transcript corpus (cap at 80k chars total)
    let totalChars = 0;
    const sessionSummaries = sessions.map((s, i) => {
      const date = new Date(s.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const content = s.transcript_text || s.summary_text || "(no transcript)";
      const snippet = content.slice(0, Math.floor(80000 / sessions.length));
      totalChars += snippet.length;
      return {
        index: i + 1,
        id: s.id,
        title: s.title,
        date,
        duration: s.duration,
        content: snippet,
        existing_summary: s.summary_text || null,
        existing_tags: s.tags || [],
        word_analysis: s.word_analysis || null,
        sentiment_analysis: s.sentiment_analysis || null,
      };
    });

    const corpusText = sessionSummaries.map(s =>
      `=== Session ${s.index}: "${s.title}" (${s.date}) ===\n${s.content}`
    ).join("\n\n");

    // Call 1: Master report (executive summary, themes, decisions, actions, risks, next steps)
    const masterPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert business analyst. Analyze these ${sessions.length} sessions from the folder "${folder_name}" and produce a comprehensive intelligence report.

SESSIONS:
${corpusText.slice(0, 50000)}

Return JSON with:
{
  "executive_summary": "4-6 sentence master summary of all sessions — key outcomes, overall progress, major decisions made",
  "per_session_summaries": [
    { "session_index": 1, "title": "...", "summary": "2-3 sentence summary of THIS session specifically", "key_decisions": ["decision1", "decision2"], "outcome": "positive|neutral|negative" }
  ],
  "key_topics": ["topic1", "topic2"] (up to 8 recurring topics across all sessions),
  "decisions_made": ["decision1", "decision2"] (up to 8 concrete decisions identified),
  "action_items": [
    { "task": "...", "owner": "name or Unassigned", "priority": "high|medium|low", "session_ref": "session title or date", "due_date": "if mentioned, else null" }
  ],
  "risks": ["risk1", "risk2"] (up to 6 risks or blockers),
  "next_steps": ["step1", "step2"] (up to 6 next steps)
}`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          per_session_summaries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                session_index: { type: "number" },
                title: { type: "string" },
                summary: { type: "string" },
                key_decisions: { type: "array", items: { type: "string" } },
                outcome: { type: "string" }
              }
            }
          },
          key_topics: { type: "array", items: { type: "string" } },
          decisions_made: { type: "array", items: { type: "string" } },
          action_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                owner: { type: "string" },
                priority: { type: "string" },
                session_ref: { type: "string" },
                due_date: { type: "string" }
              }
            }
          },
          risks: { type: "array", items: { type: "string" } },
          next_steps: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Call 2: Behavioral analysis (sentiment, speakers, argument/tension)
    const behaviorPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert in behavioral analytics and communication analysis. Analyze these ${sessions.length} meeting sessions from the folder "${folder_name}".

SESSIONS:
${corpusText.slice(0, 45000)}

Return JSON with:
{
  "overall_sentiment": "positive|neutral|negative|mixed",
  "sentiment_score": number from -1 (very negative) to 1 (very positive),
  "sentiment_trend": [
    { "session_index": 1, "label": "session title", "score": -1 to 1, "dominant_emotion": "e.g. enthusiasm, concern, frustration, neutral" }
  ],
  "speaker_engagement": [
    { "name": "Speaker name", "talk_time_pct": estimated % of conversation, "contributions": ["key contribution 1", "key contribution 2"], "engagement_level": "high|medium|low" }
  ],
  "top_words": [
    { "word": "word", "frequency": estimated count, "significance": "high|medium|low" }
  ],
  "argument_analysis": {
    "overall_tension_level": "none|low|moderate|high|very_high",
    "tension_score": 0 to 100,
    "escalation_moments": [
      { "session_ref": "session title", "description": "what happened", "intensity": "mild|moderate|severe", "resolution": "resolved|unresolved|partially_resolved" }
    ],
    "conflict_topics": ["topic that caused tension"],
    "communication_health": "healthy|strained|toxic|collaborative"
  }
}`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_sentiment: { type: "string" },
          sentiment_score: { type: "number" },
          sentiment_trend: {
            type: "array",
            items: {
              type: "object",
              properties: {
                session_index: { type: "number" },
                label: { type: "string" },
                score: { type: "number" },
                dominant_emotion: { type: "string" }
              }
            }
          },
          speaker_engagement: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                talk_time_pct: { type: "number" },
                contributions: { type: "array", items: { type: "string" } },
                engagement_level: { type: "string" }
              }
            }
          },
          top_words: {
            type: "array",
            items: {
              type: "object",
              properties: {
                word: { type: "string" },
                frequency: { type: "number" },
                significance: { type: "string" }
              }
            }
          },
          argument_analysis: {
            type: "object",
            properties: {
              overall_tension_level: { type: "string" },
              tension_score: { type: "number" },
              escalation_moments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    session_ref: { type: "string" },
                    description: { type: "string" },
                    intensity: { type: "string" },
                    resolution: { type: "string" }
                  }
                }
              },
              conflict_topics: { type: "array", items: { type: "string" } },
              communication_health: { type: "string" }
            }
          }
        }
      }
    });

    // Run both in parallel
    const [masterResult, behaviorResult] = await Promise.all([masterPromise, behaviorPromise]);

    return Response.json({
      folder: folder_name,
      session_count: sessions.length,
      master: masterResult,
      behavior: behaviorResult,
    });

  } catch (error) {
    console.error('generateInsights error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});