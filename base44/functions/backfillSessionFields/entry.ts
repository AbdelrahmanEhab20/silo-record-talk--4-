import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all sessions created before April 14, 2026
    const cutoffDate = new Date('2026-04-14T00:00:00Z').toISOString();
    const oldSessions = await base44.asServiceRole.entities.Session.filter(
      { created_date: { $lt: cutoffDate }, user_email: user.email },
      '-created_date',
      1000
    );

    if (!oldSessions || oldSessions.length === 0) {
      return Response.json({ 
        message: 'No sessions found before April 14th',
        updatedCount: 0 
      });
    }

    let updatedCount = 0;

    // Update each old session with new fields (initialize as empty if not present)
    for (const session of oldSessions) {
      const updateData = {};
      
      // Add new context fields if they don't exist
      if (!session.video_url) updateData.video_url = '';
      if (!session.image_urls) updateData.image_urls = [];
      if (!session.general_context_text) updateData.general_context_text = '';
      if (!session.agenda_text) updateData.agenda_text = '';
      if (!session.agenda_file_urls) updateData.agenda_file_urls = [];
      if (!session.manual_notes) updateData.manual_notes = [];

      // Only update if there are fields to update
      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.Session.update(session.id, updateData);
        updatedCount++;
      }
    }

    return Response.json({ 
      message: 'Backfill completed successfully',
      totalSessions: oldSessions.length,
      updatedCount: updatedCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});