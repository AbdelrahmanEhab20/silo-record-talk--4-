import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch all sessions for this user
    const sessions = await base44.entities.Session.list();

    let corrected = 0;
    const corrections = [];

    for (const session of sessions) {
      let newSource = session.source;
      let needsUpdate = false;

      // Fix video_url sessions that have no audio_file_url - they should be text
      if (session.source === 'video_url' && !session.audio_file_url && session.transcript_text) {
        newSource = 'text';
        needsUpdate = true;
        corrections.push({
          id: session.id,
          title: session.title,
          from: 'video_url',
          to: 'text',
          reason: 'No audio_file_url, only transcript',
        });
      }

      // Fix recordings with 0s duration and no notes - likely uploaded
      if (session.source === 'recording' && session.audio_file_url && !session.manual_notes?.length) {
        const duration = session.duration || 0;
        if (duration === 0 || duration < 5) {
          newSource = 'audio_upload';
          needsUpdate = true;
          corrections.push({
            id: session.id,
            title: session.title,
            from: 'recording',
            to: 'audio_upload',
            reason: `Very short duration (${duration}s) with no notes`,
          });
        }
      }

      if (needsUpdate) {
        try {
          await base44.entities.Session.update(session.id, { source: newSource });
          corrected++;
        } catch (e) {
          console.warn(`Failed to update session ${session.id}:`, e.message);
        }
      }

      // Add a small delay every 5 updates to avoid rate limiting
      if (corrected % 5 === 0) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    return Response.json({
      success: true,
      total: sessions.length,
      corrected,
      corrections,
      message: `Fixed classification for ${corrected} sessions`,
    });
  } catch (error) {
    console.error('Fix failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});