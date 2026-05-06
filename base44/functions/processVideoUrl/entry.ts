import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { video_url } = await req.json();

    if (!video_url || typeof video_url !== 'string') {
      return Response.json({ error: 'Valid video URL is required' }, { status: 400 });
    }

    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyAIKey) {
      return Response.json({ error: 'ASSEMBLYAI_API_KEY is not set.' }, { status: 500 });
    }

    // Detect platform
    const isYouTube = video_url.includes('youtube.com') || video_url.includes('youtu.be');
    const isDirectMedia = /\.(mp3|mp4|m4a|wav|ogg|webm|flac|aac)(\?.*)?$/i.test(video_url);

    // ──────────────────────────────────────────────────────
    // STAGE 1: Use Gemini to fetch video metadata + transcript/captions
    // For YouTube and web pages: Gemini uses web search to extract captions
    // For direct media URLs: skip Gemini, go straight to AssemblyAI
    // ──────────────────────────────────────────────────────

    if (isDirectMedia) {
      // Direct audio/video file → send straight to AssemblyAI
      console.log('Direct media URL detected, sending to AssemblyAI:', video_url);
      return await transcribeWithAssembly(assemblyAIKey, video_url, null, null, 'Direct Media');
    }

    // For YouTube / web pages: use Gemini to extract captions
    const extractionPrompt = `You are a video content extraction specialist. Your task is to extract the COMPLETE transcript/captions from this video URL: ${video_url}

Instructions:
1. Search for and access the video at this URL
2. Extract the FULL transcript or closed captions — every word spoken, in order
3. Include speaker labels and timestamps if available
4. Remove music notations like [Music], [Applause] but keep speech content
5. If this is a YouTube video, access its captions/subtitles directly

Platform: ${isYouTube ? 'YouTube' : 'Other'}

Return a JSON object (no markdown, no code blocks):
{
  "title": "Exact video title",
  "platform": "YouTube",
  "videoId": "extracted video ID",
  "transcript": "COMPLETE transcript text here with all spoken words...",
  "has_captions": true
}

IMPORTANT: The transcript field must contain the actual spoken content of the video, not a summary.`;

    console.log('Using Gemini to extract captions for:', video_url);
    const metadataRaw = await base44.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
    });

    let metadata;
    try {
      const metadataStr = typeof metadataRaw === 'string' ? metadataRaw : JSON.stringify(metadataRaw);
      const jsonMatch = metadataStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in Gemini response');
      metadata = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn('Failed to parse Gemini response:', e.message);
      return Response.json(
        { error: 'Could not extract video information. The video may be private, unavailable, or the URL is not supported.' },
        { status: 400 }
      );
    }

    const transcript = (metadata.transcript || '').trim();

    if (transcript && transcript.length > 100) {
      // Gemini successfully extracted captions — return directly with duration estimate
      console.log('Gemini extracted transcript, length:', transcript.length);
      const estimatedDuration = estimateDurationSecondsFromText(transcript);
      return Response.json({
        success: true,
        videoId: metadata.videoId || null,
        title: metadata.title || null,
        platform: metadata.platform || (isYouTube ? 'YouTube' : 'Other'),
        transcript,
        duration_seconds: estimatedDuration,
        source_engine: 'gemini_captions',
      });
    }

    // ──────────────────────────────────────────────────────
    // STAGE 3: Gemini couldn't get captions — try AssemblyAI
    // with the video URL directly (works for some platforms)
    // ──────────────────────────────────────────────────────

    console.log('Gemini could not extract captions, trying AssemblyAI with URL directly');
    return await transcribeWithAssembly(
      assemblyAIKey,
      video_url,
      metadata.videoId || null,
      metadata.title || null,
      metadata.platform || (isYouTube ? 'YouTube' : 'Other')
    );

  } catch (error) {
    console.error('Error processing video URL:', error);
    return Response.json(
      { error: error.message || 'Failed to process video URL' },
      { status: 500 }
    );
  }
});

// Helper function to estimate video duration from transcript word count
// Assumes average speaking rate of ~150 words per minute (comfortable pace)
function estimateDurationSecondsFromText(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 150));
  return minutes * 60;
}

async function transcribeWithAssembly(assemblyAIKey, audioUrl, videoId, title, platform) {
  const submitBody = {
    audio_url: audioUrl,
    speech_models: ['universal-2'],
    language_detection: true,
  };

  const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': assemblyAIKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submitBody),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    return Response.json({ error: `AssemblyAI submit error: ${errText}` }, { status: 500 });
  }

  const submitData = await submitRes.json();
  const jobId = submitData.id;
  console.log('AssemblyAI job submitted:', jobId);

  // Poll for up to 15 minutes (increased from 5 to handle longer videos)
  const deadline = Date.now() + 900000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));

    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${jobId}`, {
      headers: { 'Authorization': assemblyAIKey },
    });
    const data = await pollRes.json();
    console.log(`AssemblyAI job ${jobId} status: ${data.status}`);

    if (data.status === 'completed') {
      const transcript = (data.text || '').trim();
      if (!transcript) {
        return Response.json(
          { error: 'No speech detected in this video.' },
          { status: 400 }
        );
      }
      return Response.json({
        success: true,
        videoId,
        title,
        platform,
        transcript,
        duration_seconds: Math.ceil(Number(data.audio_duration || 0)),
        source_engine: 'assemblyai',
      });
    }

    if (data.status === 'error') {
      return Response.json(
        { error: `Transcription failed: ${data.error || 'AssemblyAI error'}` },
        { status: 500 }
      );
    }
  }

  return Response.json({ error: 'Transcription timed out after 15 minutes.' }, { status: 504 });
}