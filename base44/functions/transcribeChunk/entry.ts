import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_BYTES = 24 * 1024 * 1024; // 25MB Whisper limit (with 1MB safety margin)

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Auth
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ error: 'Invalid JSON body: ' + e.message }, { status: 400 });
  }

  const { audio_base64, mime_type, language, previous_transcript } = body;

  // Use user's own API key if set, otherwise fall back to app key
  const userApiKey = user?.openai_api_key?.trim();
  const apiKey = userApiKey || Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return Response.json({ error: 'No OpenAI API key available. Add your own in Settings → AI & Speech.' }, { status: 500 });
  }

  if (!audio_base64) {
    return Response.json({ error: 'audio_base64 is required' }, { status: 400 });
  }

  // Decode base64 — use Uint8Array approach safe for Deno
  let bytes;
  try {
    // Deno-safe base64 decode
    const cleaned = audio_base64.replace(/\s/g, '');
    const binaryStr = atob(cleaned);
    bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
  } catch (e) {
    return Response.json({ error: 'Failed to decode base64 audio: ' + e.message }, { status: 400 });
  }

  // Check chunk size
  if (bytes.length > MAX_BYTES) {
    return Response.json({
      error: `Chunk too large: ${(bytes.length / 1024 / 1024).toFixed(2)}MB. Whisper limit is 25MB. Split into smaller chunks.`
    }, { status: 400 });
  }

  // Determine file extension from MIME type
  const mimeType = (mime_type || 'audio/webm').split(';')[0].trim();
  let ext = 'webm';
  if (mimeType.includes('mp4')) ext = 'mp4';
  else if (mimeType.includes('ogg')) ext = 'ogg';
  else if (mimeType.includes('wav')) ext = 'wav';
  else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) ext = 'mp3';
  else if (mimeType.includes('m4a')) ext = 'm4a';
  else if (mimeType.includes('flac')) ext = 'flac';

  // Whisper supported formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
  const supportedExts = ['flac', 'mp3', 'mp4', 'wav', 'm4a', 'ogg', 'webm'];
  if (!supportedExts.includes(ext)) {
    return Response.json({
      error: `Unsupported audio format: ${mimeType} (ext: ${ext}). Whisper supports: ${supportedExts.join(', ')}`
    }, { status: 400 });
  }

  // Build FormData for Whisper
  const formData = new FormData();
  formData.append('file', new File([bytes], `chunk.${ext}`, { type: mimeType }));
  formData.append('model', 'whisper-1');
  if (language) formData.append('language', language);
  if (previous_transcript) {
    const contextPrompt = previous_transcript.split('\n').slice(-3).join(' ').replace(/\[\d{2}:\d{2}\]\s*/g, '');
    formData.append('prompt', contextPrompt.slice(-500));
  }

  // Call Whisper
  let whisperResponse;
  try {
    whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });
  } catch (e) {
    return Response.json({ error: 'Network error calling Whisper API: ' + e.message }, { status: 500 });
  }

  if (!whisperResponse.ok) {
    let errBody = '';
    try {
      errBody = await whisperResponse.text();
    } catch (_) {}
    console.error(`Whisper API ${whisperResponse.status}: ${errBody}`);
    return Response.json({
      error: `Whisper API returned ${whisperResponse.status}`,
      details: errBody,
      mime_type: mimeType,
      ext,
      chunk_size_mb: (bytes.length / 1024 / 1024).toFixed(2),
    }, { status: 500 });
  }

  let result;
  try {
    result = await whisperResponse.json();
  } catch (e) {
    return Response.json({ error: 'Failed to parse Whisper response: ' + e.message }, { status: 500 });
  }

  return Response.json({ transcript: result.text || '' });
});