import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns a JSON package with all session data for client-side ZIP generation
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id } = await req.json();
    if (!session_id) return Response.json({ error: 'session_id required' }, { status: 400 });

    const session = await base44.asServiceRole.entities.Session.get(session_id);
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
    if (session.user_email !== user.email) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Build minutes document text
    const minutes = buildMinutesDoc(session);

    return Response.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        duration: session.duration,
        created_date: session.created_date,
        audio_file_url: session.audio_file_url,
        transcript_text: session.transcript_text,
        summary_text: session.summary_text,
        tags: session.tags,
        session_type: session.session_type,
      },
      minutes_text: minutes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildMinutesDoc(session) {
  const lines = [];
  lines.push(`SESSION MINUTES`);
  lines.push(`===============`);
  lines.push(`Title: ${session.title}`);
  lines.push(`Date: ${session.created_date ? new Date(session.created_date).toLocaleString('en-US') : 'N/A'}`);
  lines.push(`Duration: ${session.duration ? formatDuration(session.duration) : 'N/A'}`);
  if (session.session_type) lines.push(`Type: ${session.session_type}`);
  if (session.tags?.length) lines.push(`Tags: ${session.tags.join(', ')}`);
  lines.push('');

  if (session.summary_text) {
    lines.push(`SUMMARY`);
    lines.push(`-------`);
    lines.push(session.summary_text);
    lines.push('');
  }

  if (session.transcript_text) {
    lines.push(`FULL TRANSCRIPT`);
    lines.push(`---------------`);
    lines.push(session.transcript_text);
    lines.push('');
  }

  if (session.manual_notes?.length) {
    lines.push(`MANUAL NOTES`);
    lines.push(`------------`);
    session.manual_notes.forEach((n, i) => lines.push(`${i + 1}. ${n}`));
  }

  return lines.join('\n');
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}