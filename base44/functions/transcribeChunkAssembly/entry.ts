import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

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

  const { audio_base64, mime_type, language } = body;

  if (!audio_base64) {
    return Response.json({ error: 'audio_base64 is required' }, { status: 400 });
  }

  const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY');
  if (!assemblyAIKey) {
    return Response.json({ error: 'ASSEMBLYAI_API_KEY is not set.' }, { status: 500 });
  }

  // Decode base64 audio
  let bytes;
  try {
    const cleaned = audio_base64.replace(/\s/g, '');
    const binaryStr = atob(cleaned);
    bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
  } catch (e) {
    return Response.json({ error: 'Failed to decode base64 audio: ' + e.message }, { status: 400 });
  }

  // Determine file extension
  const mimeType = (mime_type || 'audio/webm').split(';')[0].trim();
  let ext = 'webm';
  if (mimeType.includes('mp4')) ext = 'mp4';
  else if (mimeType.includes('ogg')) ext = 'ogg';
  else if (mimeType.includes('wav')) ext = 'wav';
  else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) ext = 'mp3';
  else if (mimeType.includes('m4a')) ext = 'm4a';
  else if (mimeType.includes('flac')) ext = 'flac';

  // Step 1: Upload audio chunk to Base44 to get a public URL
  let audioUrl;
  try {
    const audioFile = new File([bytes], `chunk.${ext}`, { type: mimeType });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: audioFile });
    audioUrl = uploadResult.file_url;
    console.log('Uploaded chunk to:', audioUrl);
  } catch (e) {
    return Response.json({ error: 'Failed to upload audio chunk: ' + e.message }, { status: 500 });
  }

  // Step 2: Submit transcription job to AssemblyAI
  let jobId;
  try {
    const submitBody = {
      audio_url: audioUrl,
      speech_models: ['universal-2'],
    };
    if (language) {
      submitBody.language_code = language;
    } else {
      submitBody.language_detection = true;
    }

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
    jobId = submitData.id;
    console.log('AssemblyAI job submitted:', jobId);
  } catch (e) {
    return Response.json({ error: 'Failed to submit to AssemblyAI: ' + e.message }, { status: 500 });
  }

  // Step 3: Poll for result (up to 3 minutes for a chunk)
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000));

    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${jobId}`, {
      headers: { 'Authorization': assemblyAIKey },
    });
    const data = await pollRes.json();
    console.log(`AssemblyAI job ${jobId} status: ${data.status}`);

    if (data.status === 'completed') {
      return Response.json({ transcript: data.text || '', provider: 'assemblyai' });
    }

    if (data.status === 'error') {
      return Response.json({ error: `AssemblyAI transcription error: ${data.error}` }, { status: 500 });
    }
  }

  return Response.json({ error: 'AssemblyAI transcription timed out after 3 minutes.' }, { status: 504 });
});