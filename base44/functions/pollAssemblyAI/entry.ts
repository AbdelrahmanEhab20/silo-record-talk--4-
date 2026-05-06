import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function detectDialectSimple(text) {
  if (!text) return { isArabic: false };
  const arabicPattern = /[\u0600-\u06FF]/;
  if (!arabicPattern.test(text)) return { isArabic: false };

  const dialects = {
    egyptian: ['انت', 'ايه', 'عايز', 'مش', 'دلوقتي', 'بقى', 'ازيك', 'كده'],
    gulf: ['وين', 'شلونك', 'شنو', 'ليش', 'هاي', 'ذا', 'يبه', 'ابشر', 'زين'],
    levantine: ['شو', 'كيفك', 'هلق', 'مني', 'هيك', 'ليش', 'وين', 'بدي', 'منيح'],
    moroccan: ['واش', 'كيفاش', 'هادشي', 'ماشي', 'بزاف', 'دابا', 'نتا', 'شنو'],
    iraqi: ['شگول', 'شلون', 'هواية', 'ابد', 'چاي', 'گلبي', 'يمته', 'هسه'],
  };

  const dialectLabels = {
    egyptian: '🇪🇬 Egyptian Arabic',
    gulf: '🇸🇦 Gulf Arabic',
    levantine: '🇱🇧 Levantine Arabic',
    moroccan: '🇲🇦 Moroccan Arabic',
    iraqi: '🇮🇶 Iraqi Arabic',
  };

  let maxScore = 0;
  let detectedDialect = 'msa';

  for (const [dialect, keywords] of Object.entries(dialects)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      detectedDialect = dialect;
    }
  }

  return {
    isArabic: true,
    dialect: detectedDialect,
    label: dialectLabels[detectedDialect] || '🌍 Arabic',
  };
}

function detectLanguageMix(text) {
  if (!text) return { isMultilingual: false, dominantLanguage: 'en' };

  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const totalChars = arabicChars + latinChars;

  if (totalChars === 0) return { isMultilingual: false, dominantLanguage: 'en' };

  const arabicRatio = arabicChars / totalChars;
  const latinRatio = latinChars / totalChars;

  return {
    isMultilingual: arabicRatio > 0.1 && latinRatio > 0.1,
    dominantLanguage: arabicRatio > latinRatio ? 'ar' : 'en',
    arabicRatio,
    latinRatio,
  };
}

function formatAssemblyAITranscript(data) {
  if (data.words && data.words.length > 0) {
    const CHUNK_SEC = 5;
    const lines = [];
    let chunkStart = null;
    let chunkWords = [];
    let chunkSpeaker = null;

    const flushChunk = () => {
      if (!chunkWords.length || chunkStart === null) return;
      const sec = Math.floor(chunkStart / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      const ts = `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
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
      const speakerChanged = !!(word.speaker && chunkSpeaker && word.speaker !== chunkSpeaker);

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
    return data.utterances
      .map((u) => {
        const sec = Math.floor(u.start / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}] Speaker ${u.speaker}: ${u.text}`;
      })
      .join('\n');
  }

  return data.text || '';
}

 async function buildTranscriptUpdateFields(base44, sessionId, transcriptText) {
  const safePreviewLimit = 2000;
  const uploadedPreviewLimit = 3500;
  const maxRetries = 3;
  const retryDelayMs = 1000;

  // First, try to get existing session to preserve file_url if needed
  let existingFileUrl = null;
  try {
    const existingSession = await base44.asServiceRole.entities.Session.get(sessionId);
    existingFileUrl = existingSession?.transcript_file_url;
  } catch (err) {
    console.warn(`Could not fetch existing session ${sessionId}:`, err?.message || err);
  }

  // Attempt upload with retries
  let uploadError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const file = new File([transcriptText || ''], `transcript_${sessionId}.txt`, { type: 'text/plain' });
      const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });

      const preview =
        (transcriptText || '').slice(0, uploadedPreviewLimit) +
        ((transcriptText || '').length > uploadedPreviewLimit
          ? '\n...[truncated, see transcript_file_url]'
          : '');

      return {
        transcript_file_url: uploadRes.file_url,
        transcript_text: preview,
      };
    } catch (err) {
      uploadError = err;
      console.warn(`Transcript upload attempt ${attempt}/${maxRetries} failed for session ${sessionId}:`, err?.message || err);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, retryDelayMs * attempt));
      }
    }
  }

  // All upload attempts failed — preserve existing file_url if available
  console.error(`Transcript upload permanently failed for session ${sessionId}:`, uploadError?.message || uploadError);

  const isTruncated = (transcriptText || '').length > safePreviewLimit;
  const previewText = isTruncated
    ? (transcriptText || '').slice(0, safePreviewLimit) + '\n...[upload failed; transcript truncated]'
    : (transcriptText || '');

  return {
    ...(existingFileUrl ? { transcript_file_url: existingFileUrl } : {}),
    transcript_text: previewText,
  };
}

async function finalizeTranscriptReady(base44, session, transcriptText) {
  const transcriptUpdateFields = await buildTranscriptUpdateFields(base44, session.id, transcriptText);
  const langMix = detectLanguageMix(transcriptText);
  const dialectResult = detectDialectSimple(transcriptText);

  await base44.asServiceRole.entities.Session.update(session.id, {
    ...transcriptUpdateFields,
    processing_status: session.is_subsession ? 'done' : 'transcript_ready',
    assemblyai_job_id: null,
    transcript_language: langMix.dominantLanguage,
    is_multilingual: langMix.isMultilingual,
    ...(dialectResult.isArabic ? { dialect: dialectResult.dialect, dialect_label: dialectResult.label } : {}),
  });

  if (!session.is_subsession) {
    try {
      await base44.asServiceRole.functions.invoke('processSessionBackground', {
        session_id: session.id,
        force_transcribe: false,
      });
    } catch (invokeErr) {
      console.warn(`Failed to trigger async analysis for session ${session.id}:`, invokeErr?.message || invokeErr);
    }
  }

  return { session_id: session.id, status: session.is_subsession ? 'done' : 'transcript_ready' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyAIKey) {
      return Response.json({ error: 'ASSEMBLYAI_API_KEY not set' }, { status: 500 });
    }

    // Poll any session still holding an active AssemblyAI job.
    const inFlight = await base44.asServiceRole.entities.Session.filter({});
    const sessionsToPoll = (inFlight || []).filter(
      (s) =>
        !!s.assemblyai_job_id &&
        !['done', 'failed', 'transcript_ready'].includes(String(s.processing_status || ''))
    );

    console.log(`pollAssemblyAI: found ${sessionsToPoll.length} sessions with active assemblyai_job_id`);
    const results = [];

    for (const session of sessionsToPoll) {
      const jobId = session.assemblyai_job_id;
      if (!jobId) {
        results.push({ session_id: session.id, status: 'skipped', reason: 'no job id' });
        continue;
      }

      try {
        const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${jobId}`, {
          headers: { Authorization: assemblyAIKey },
        });

        if (!pollRes.ok) {
          const errText = await pollRes.text();
          console.error(`AssemblyAI poll failed for session ${session.id}: ${pollRes.status} ${errText}`);
          results.push({ session_id: session.id, status: 'poll_error', error: errText });
          continue;
        }

        const data = await pollRes.json();
        const remoteStatus = data.status;
        console.log(`pollAssemblyAI: session=${session.id} job=${jobId} status=${remoteStatus}`);

        // Re-fetch current row for race-safe idempotency against webhook
        const current = await base44.asServiceRole.entities.Session.get(session.id);
        if (!current || current.assemblyai_job_id !== jobId) {
          results.push({ session_id: session.id, status: 'skipped', reason: 'stale job mapping / already handled' });
          continue;
        }

        if (['done', 'failed', 'transcript_ready'].includes(String(current.processing_status || ''))) {
          results.push({ session_id: session.id, status: 'skipped', reason: `already finalized (${current.processing_status})` });
          continue;
        }

        if (remoteStatus === 'error') {
          await base44.asServiceRole.entities.Session.update(session.id, {
            processing_status: 'failed',
            assemblyai_job_id: null,
          });
          results.push({ session_id: session.id, status: 'failed', error: data.error || 'AssemblyAI error' });
          continue;
        }

        if (remoteStatus !== 'completed') {
          results.push({ session_id: session.id, status: remoteStatus || 'transcribing' });
          continue;
        }

        let transcriptText = formatAssemblyAITranscript(data) || data.text || '';
        if (!transcriptText.trim()) {
          transcriptText = '[No transcript text returned from AssemblyAI]';
        }

        const done = await finalizeTranscriptReady(base44, current, transcriptText);
        results.push(done);
      } catch (e) {
        console.error(`pollAssemblyAI: error for session ${session.id}:`, e?.message || e);
        results.push({ session_id: session.id, status: 'error', error: e?.message || 'unknown' });
      }
    }

    return Response.json({ polled: sessionsToPoll.length, results });
  } catch (error) {
    console.error('pollAssemblyAI error:', error?.message || error);
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});