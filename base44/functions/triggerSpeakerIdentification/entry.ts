import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event } = await req.json();

    if (event.type !== 'create' && event.type !== 'update') {
      return Response.json({ status: 'skipped' });
    }

    const session = event.data;
    
    // Only process if session has a transcript and hasn't been identified yet
    if (!session.transcript_text || (session.speaker_mapping && Object.keys(session.speaker_mapping).length > 0)) {
      return Response.json({ status: 'skipped', reason: 'No transcript or already identified' });
    }

    // Invoke speaker identification
    const result = await base44.asServiceRole.functions.invoke('autoIdentifySpeakers', {
      sessionId: event.entity_id
    });

    if (result.data?.suggestions && Object.keys(result.data.suggestions).length > 0) {
      // Auto-apply all suggestions
      const newMapping = { ...result.data.suggestions };
      await base44.asServiceRole.entities.Session.update(event.entity_id, {
        speaker_mapping: newMapping,
        // Also update transcript with mapped speaker names
      });
      
      return Response.json({ 
        status: 'success', 
        suggestionsApplied: Object.keys(newMapping).length 
      });
    }

    return Response.json({ status: 'no_suggestions' });
  } catch (error) {
    console.error('Trigger speaker identification error:', error);
    return Response.json({ 
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
});