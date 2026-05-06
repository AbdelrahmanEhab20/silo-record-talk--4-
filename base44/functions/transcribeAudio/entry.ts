import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function transcribeWithAssemblyAI(audioUrl, assemblyAIKey) {
  const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': assemblyAIKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      speech_model: 'universal',
      language_detection: true,
    }),
  });
  if (!submitRes.ok) throw new Error(`AssemblyAI submit error: ${await submitRes.text()}`);
  const submitData = await submitRes.json();
  if (!submitData.id) throw new Error(`AssemblyAI did not return a transcript ID: ${JSON.stringify(submitData)}`);
  const { id } = submitData;
  console.log(`AssemblyAI job submitted: ${id}`);

  // Poll up to 20 minutes for long recordings
  const deadline = Date.now() + 1200000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 8000));
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { 'Authorization': assemblyAIKey },
    });
    const data = await pollRes.json();
    if (data.status === 'completed') {
      if (data.words && data.words.length > 0) {
        const CHUNK_SEC = 5;
        const lines = [];
        let chunkStart = null;
        let chunkWords = [];
        let chunkSpeaker = null;

        const flushChunk = () => {
          if (chunkWords.length === 0) return;
          const sec = Math.floor(chunkStart / 1000);
          const m = Math.floor(sec / 60);
          const s = sec % 60;
          const ts = `[${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}]`;
          const speakerLabel = chunkSpeaker ? ` Speaker ${chunkSpeaker}:` : '';
          lines.push(`${ts}${speakerLabel} ${chunkWords.join(' ')}`);
          chunkWords = [];
          chunkStart = null;
          chunkSpeaker = null;
        };

        for (const word of data.words) {
          if (chunkStart === null) {
            chunkStart = word.start;
            chunkSpeaker = word.speaker || null;
          }
          const elapsedSec = (word.start - chunkStart) / 1000;
          const speakerChanged = word.speaker && chunkSpeaker && word.speaker !== chunkSpeaker;
          if (elapsedSec >= CHUNK_SEC || speakerChanged) {
            flushChunk();
            chunkStart = word.start;
            chunkSpeaker = word.speaker || null;
          }
          chunkWords.push(word.text);
        }
        flushChunk();
        return lines.join('\n');
      }
      if (data.utterances && data.utterances.length > 0) {
        return data.utterances.map(u => {
          const sec = Math.floor(u.start / 1000);
          const m = Math.floor(sec / 60);
          const s = sec % 60;
          return `[${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}] Speaker ${u.speaker}: ${u.text}`;
        }).join('\n');
      }
      return data.text || '';
    }
    if (data.status === 'error') throw new Error(`AssemblyAI error: ${data.error}`);
  }
  throw new Error('AssemblyAI transcription timed out');
}

async function transcribeWithWhisper(audioUrl, openaiKey, language) {
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) throw new Error('Failed to fetch audio file');
  const audioBlob = await audioResponse.blob();
  const ext = audioUrl.split('?')[0].split('.').pop() || 'webm';
  const mimeType = audioBlob.type || `audio/${ext}`;

  const formData = new FormData();
  formData.append('file', new File([audioBlob], `audio.${ext}`, { type: mimeType }));
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');
  if (language) formData.append('language', language);

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}` },
    body: formData,
  });
  if (!whisperRes.ok) throw new Error(`Whisper API error: ${await whisperRes.text()}`);
  const result = await whisperRes.json();

  if (result.segments && result.segments.length > 0) {
    return result.segments.map((seg) => {
      const m = Math.floor(seg.start / 60);
      const s = Math.floor(seg.start % 60);
      return `[${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}] ${seg.text.trim()}`;
    }).join('\n');
  }
  return result.text || '';
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audio_url, language } = body;
    if (!audio_url) {
      return Response.json({ error: 'audio_url is required' }, { status: 400 });
    }

    const { session_id } = body;
    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (assemblyAIKey) {
      // Submit job asynchronously — pollAssemblyAI will pick up the result every minute
      console.log('transcribeAudio: submitting AssemblyAI job (async)');
      const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: { 'Authorization': assemblyAIKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: audio_url,
          speaker_labels: true,
          speech_models: ['universal-3-pro', 'universal-2'],
          language_detection: true,
          webhook_url: `${Deno.env.get('BASE44_FUNCTION_BASE_URL') || 'https://api.base44.com/api/apps/' + Deno.env.get('BASE44_APP_ID') + '/functions'}/assemblyAIWebhook`,
        }),
      });
      if (!submitRes.ok) throw new Error(`AssemblyAI submit error: ${await submitRes.text()}`);
      const submitData = await submitRes.json();
      if (!submitData.id) throw new Error('AssemblyAI did not return a job ID');
      console.log(`AssemblyAI job submitted: ${submitData.id}`);

      // Save job ID to session so pollAssemblyAI can complete it
      if (session_id) {
        await base44.asServiceRole.entities.Session.update(session_id, {
          processing_status: 'processing',
          assemblyai_job_id: submitData.id,
        });
      }

      return Response.json({ status: 'processing', assemblyai_job_id: submitData.id, provider: 'assemblyai' });
    } else if (openaiKey) {
      console.log('transcribeAudio: using OpenAI Whisper');
      const transcript = await transcribeWithWhisper(audio_url, openaiKey, language);
      return Response.json({ transcript, provider: 'openai_whisper' });
    } else {
      return Response.json({ error: 'No transcription API key available.' }, { status: 500 });
    }
  } catch (error) {
    console.error('transcribeAudio error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});