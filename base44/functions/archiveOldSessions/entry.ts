import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    // ── 1. Auto-archive sessions older than 30 days (hot tier, not subsessions) ──
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAfterNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all hot sessions created before 30 days ago
    const hotSessions = await base44.asServiceRole.entities.Session.filter(
      { storage_tier: 'hot', is_subsession: false },
      '-created_date',
      500
    );

    const toArchive = hotSessions.filter(s => {
      const lastActivity = s.last_accessed_at || s.updated_date || s.created_date;
      return lastActivity < thirtyDaysAgo;
    });

    let archivedCount = 0;
    for (const session of toArchive) {
      const archivedAt = now.toISOString();
      const deletionAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.Session.update(session.id, {
        storage_tier: 'archived',
        archived_at: archivedAt,
        scheduled_deletion_at: deletionAt,
        restore_status: 'none',
        folder: 'Archived',
      });
      archivedCount++;

      // Send archival notification email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: session.user_email,
          subject: `📦 Session archived: "${session.title}"`,
          body: `Your session "<b>${session.title}</b>" has been moved to the Archive folder due to 30 days of inactivity.\n\nIt will be permanently deleted on <b>${new Date(deletionAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b> unless you download or restore it.\n\nOpen the app to download or restore this session before it's gone.`,
        });
      } catch (e) {
        console.warn('Email failed for', session.user_email, e.message);
      }
    }

    // ── 2. Notify users 7 days before permanent deletion ──
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const archivedSessions = await base44.asServiceRole.entities.Session.filter(
      { storage_tier: 'archived' },
      '-archived_at',
      500
    );

    let notifiedCount = 0;
    for (const session of archivedSessions) {
      if (!session.scheduled_deletion_at) continue;
      if (session.deletion_notified_at) continue; // already notified
      if (session.scheduled_deletion_at <= sevenDaysFromNow) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: session.user_email,
            subject: `⚠️ Session deleting in 7 days: "${session.title}"`,
            body: `Your archived session "<b>${session.title}</b>" will be <b>permanently deleted on ${new Date(session.scheduled_deletion_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b>.\n\nPlease open the app to download or restore it before it's gone forever.`,
          });
          await base44.asServiceRole.entities.Session.update(session.id, {
            deletion_notified_at: now.toISOString(),
          });
          notifiedCount++;
        } catch (e) {
          console.warn('Deletion notification failed:', e.message);
        }
      }
    }

    // ── 3. Permanently delete sessions past their deletion date ──
    let deletedCount = 0;
    for (const session of archivedSessions) {
      if (!session.scheduled_deletion_at) continue;
      if (session.scheduled_deletion_at <= now.toISOString()) {
        try {
          await base44.asServiceRole.entities.Session.delete(session.id);
          deletedCount++;
        } catch (e) {
          console.warn('Delete failed:', session.id, e.message);
        }
      }
    }

    // ── 4. Auto-complete restore requests (simulate retrieval after 30s) ──
    const retrievingSessions = archivedSessions.filter(
      s => s.restore_status === 'retrieving' && s.restore_requested_at
    );
    for (const session of retrievingSessions) {
      const requestedAt = new Date(session.restore_requested_at).getTime();
      const elapsed = now.getTime() - requestedAt;
      if (elapsed >= 30000) { // 30 seconds simulated retrieval
        await base44.asServiceRole.entities.Session.update(session.id, {
          storage_tier: 'hot',
          restore_status: 'restored',
          archived_at: null,
          scheduled_deletion_at: null,
          folder: null,
        });
      }
    }

    return Response.json({
      success: true,
      archived: archivedCount,
      notified: notifiedCount,
      deleted: deletedCount,
      restoreCompleted: retrievingSessions.length,
    });
  } catch (error) {
    console.error('archiveOldSessions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});