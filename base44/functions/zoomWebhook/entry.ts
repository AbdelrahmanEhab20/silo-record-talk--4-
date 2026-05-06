import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // Zoom URL validation challenge (required during webhook registration)
    if (body.event === 'endpoint.url_validation') {
      const token = Deno.env.get("ZOOM_WEBHOOK_SECRET_TOKEN") || "";
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(token), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body.payload.plainToken));
      const hashForValidate = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      return Response.json({ plainToken: body.payload.plainToken, encryptedToken: hashForValidate });
    }

    // Handle recording completed event
    if (body.event === 'recording.completed') {
      const base44 = createClientFromRequest(req);
      const payload = body.payload.object;
      const meetingTitle = payload.topic || `Zoom Meeting ${payload.id}`;
      const hostEmail = payload.host_email;
      const startTime = payload.start_time;
      const duration = payload.duration * 60; // convert to seconds
      const attendees = (payload.participant_audio_files || []).map(p => p.file_name);

      // Find the audio recording file
      const audioFile = (payload.recording_files || []).find(f => f.file_type === 'M4A' || f.file_type === 'MP4');

      let transcriptText = '';
      if (audioFile?.download_url) {
        // Download audio and transcribe via Whisper
        const audioRes = await fetch(audioFile.download_url);
        const audioBuffer = await audioRes.arrayBuffer();
        const file = new File([audioBuffer], 'zoom_recording.m4a', { type: 'audio/m4a' });
        const transcription = await openai.audio.transcriptions.create({ file, model: 'whisper-1' });
        transcriptText = transcription.text;
      }

      // Save as a Silo session
      await base44.asServiceRole.entities.Session.create({
        user_email: hostEmail,
        title: meetingTitle,
        duration,
        transcript_text: transcriptText,
        calendar_event_date: startTime,
        calendar_attendees: attendees,
        calendar_provider: 'zoom',
        tags: ['zoom', 'auto-recorded'],
      });

      return Response.json({ success: true });
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});