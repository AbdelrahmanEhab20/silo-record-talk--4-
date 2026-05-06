import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all sessions for this user
    const sessions = await base44.entities.Session.list();

    // Count by source
    const counts = {
      recording: 0,
      audio_upload: 0,
      video_url: 0,
      text: 0,
      images: 0,
      unclassified: 0,
    };

    const issues = [];

    for (const session of sessions) {
      const source = session.source || 'unclassified';
      counts[source] = (counts[source] || 0) + 1;

      // Validate classification accuracy
      if (session.video_url && source !== 'video_url') {
        issues.push({
          id: session.id,
          title: session.title,
          issue: `Has video_url but source is '${source}'`,
          expected: 'video_url',
          actual: source,
        });
      }

      if (session.image_urls?.length > 0 && source !== 'images') {
        issues.push({
          id: session.id,
          title: session.title,
          issue: `Has image_urls but source is '${source}'`,
          expected: 'images',
          actual: source,
        });
      }

      if (!session.audio_file_url && session.transcript_text && source !== 'text') {
        issues.push({
          id: session.id,
          title: session.title,
          issue: `Has no audio_file_url but has transcript, source is '${source}'`,
          expected: 'text',
          actual: source,
        });
      }

      // Warn if recording/audio_upload distinction might be wrong
      if (source === 'recording' && session.audio_file_url) {
        const duration = session.duration || 0;
        const hasNotes = session.manual_notes && session.manual_notes.length > 0;
        if (duration < 15 && !hasNotes) {
          issues.push({
            id: session.id,
            title: session.title,
            issue: `Marked as 'recording' but very short (${duration}s) with no notes - might be 'audio_upload'`,
            expected: 'audio_upload',
            actual: source,
            severity: 'warning',
          });
        }
      }
    }

    return Response.json({
      success: true,
      total: sessions.length,
      counts,
      issues,
      issueCount: issues.length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
      errorCount: issues.filter(i => !i.severity || i.severity !== 'warning').length,
    });
  } catch (error) {
    console.error('Validation failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});