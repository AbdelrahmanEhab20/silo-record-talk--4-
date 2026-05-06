import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
  try {
    // MS Graph sends a validationToken query param during subscription setup
    const url = new URL(req.url);
    const validationToken = url.searchParams.get('validationToken');
    if (validationToken) {
      return new Response(validationToken, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const body = await req.json();
    const base44 = createClientFromRequest(req);

    for (const notification of (body.value || [])) {
      const resource = notification.resource;
      if (!resource) continue;

      // Fetch call record details from Microsoft Graph
      const accessToken = notification.clientState; // passed when creating the subscription
      const callId = resource.split('/').pop();

      const callRes = await fetch(`https://graph.microsoft.com/v1.0/communications/callRecords/${callId}?$expand=sessions($expand=segments)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const callRecord = await callRes.json();

      const meetingTitle = callRecord.joinWebUrl
        ? `Teams Meeting ${new Date(callRecord.startDateTime).toLocaleDateString()}`
        : 'Teams Meeting';

      const duration = callRecord.sessions?.[0]?.segments?.reduce((acc, s) => {
        const start = new Date(s.startDateTime);
        const end = new Date(s.endDateTime);
        return acc + Math.round((end - start) / 1000);
      }, 0) || 0;

      const attendees = (callRecord.participants || []).map(p => p.user?.displayName || p.user?.userPrincipalName).filter(Boolean);

      // Try to get recording from OneDrive if available
      let transcriptText = '';
      if (callRecord.recordings?.[0]?.content) {
        const audioRes = await fetch(callRecord.recordings[0].content, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const audioBuffer = await audioRes.arrayBuffer();
        const file = new File([audioBuffer], 'teams_recording.mp4', { type: 'video/mp4' });
        const transcription = await openai.audio.transcriptions.create({ file, model: 'whisper-1' });
        transcriptText = transcription.text;
      }

      await base44.asServiceRole.entities.Session.create({
        user_email: callRecord.organizer?.user?.userPrincipalName || '',
        title: meetingTitle,
        duration,
        transcript_text: transcriptText,
        calendar_event_date: callRecord.startDateTime,
        calendar_attendees: attendees,
        calendar_provider: 'other',
        tags: ['teams', 'auto-recorded'],
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});