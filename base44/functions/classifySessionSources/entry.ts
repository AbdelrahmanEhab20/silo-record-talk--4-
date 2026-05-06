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

    let updated = 0;
    let unchanged = 0;
    const toUpdate = [];

    // First pass: classify all sessions
    for (const session of sessions) {
      // Skip if already has a source
      if (session.source) {
        unchanged++;
        continue;
      }

      // Classify based on available fields with enhanced heuristics
      let source = 'recording'; // default

      // Explicit markers take priority
      if (session.video_url) {
        source = 'video_url';
      } else if (session.image_urls && session.image_urls.length > 0) {
        source = 'images';
      } else if (!session.audio_file_url && session.transcript_text) {
        // No audio file but has transcript = text paste
        source = 'text';
      } else if (session.audio_file_url) {
        // Has audio file - distinguish between recording and upload
        // Heuristics:
        // 1. If it's a subsession, it's always a recording (from stop & new)
        // 2. If it has no manual_notes and short duration, likely upload
        // 3. If it has duration < 15s, likely an uploaded audio snippet
        // 4. Otherwise default to recording

        if (session.is_subsession) {
          source = 'recording';
        } else if (session.duration && session.duration < 15) {
          // Very short audio is likely uploaded, not live recorded
          source = 'audio_upload';
        } else if (!session.manual_notes || session.manual_notes.length === 0) {
          // No manual notes taken during recording = likely upload
          // (users typically take notes during live recording)
          source = 'audio_upload';
        } else {
          source = 'recording';
        }
      }

      toUpdate.push({ id: session.id, source });
    }

    // Second pass: batch update with delays to avoid rate limiting
    for (let i = 0; i < toUpdate.length; i++) {
      const { id, source } = toUpdate[i];
      try {
        await base44.entities.Session.update(id, { source });
        updated++;
      } catch (e) {
        console.warn(`Failed to update session ${id}:`, e.message);
      }
      
      // Add a small delay every 5 updates to avoid rate limiting
      if ((i + 1) % 5 === 0) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return Response.json({
      success: true,
      total: sessions.length,
      updated,
      unchanged,
      message: `Classified ${updated} sessions, ${unchanged} already had source`,
    });
  } catch (error) {
    console.error('Classification failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});