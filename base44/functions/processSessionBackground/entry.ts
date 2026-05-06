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
  const isMultilingual = arabicRatio > 0.1 && latinRatio > 0.1;
  const dominantLanguage = arabicRatio > latinRatio ? 'ar' : 'en';

  return { isMultilingual, dominantLanguage, arabicRatio, latinRatio };
}

function isTruncatedPreview(text) {
  const t = String(text || '');
  return (
    t.includes('...[truncated') ||
    t.includes('see transcript_file_url') ||
    t.includes('upload failed; transcript truncated')
  );
}

async function loadTranscriptFromSession(session) {
  const inlineText = String(session?.transcript_text || '').trim();
  const shouldFetchFile = !inlineText || isTruncatedPreview(inlineText);

  if (shouldFetchFile && session?.transcript_file_url) {
    try {
      const r = await fetch(session.transcript_file_url);
      if (r.ok) {
        const full = await r.text();
        if (full && full.trim()) return full.trim();
      }
    } catch (e) {
      console.warn(`Failed loading transcript_file_url for session ${session.id}:`, e?.message || e);
    }
  }

  return inlineText;
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

async function transcribeWithWhisper(audioUrl, openaiKey) {
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

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: formData,
  });

  if (!whisperRes.ok) throw new Error(`Whisper API error: ${await whisperRes.text()}`);
  const result = await whisperRes.json();

  if (result.segments && result.segments.length > 0) {
    return result.segments
      .map((seg) => {
        const m = Math.floor(seg.start / 60);
        const s = Math.floor(seg.start % 60);
        return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}] ${seg.text.trim()}`;
      })
      .join('\n');
  }
  return result.text || '';
}

function estimateMinutesFromText(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 150));
}

function extractMaxTimestampSeconds(text) {
  const input = String(text || '');
  const re = /\[(\d{1,3})\s*:\s*(\d{2})\]/g;
  let maxSec = 0;
  let m;

  while ((m = re.exec(input)) !== null) {
    const mm = Number(m[1] || 0);
    const ss = Number(m[2] || 0);
    if (!Number.isFinite(mm) || !Number.isFinite(ss)) continue;
    const total = mm * 60 + ss;
    if (total > maxSec) maxSec = total;
  }

  return maxSec;
}

function computeBillableMinutes(session, transcriptText) {
  const source = String(session?.source || '').toLowerCase();
  const durationSec = Number(session?.duration || 0);

  const durationMinutesFromField = durationSec > 0 ? Math.ceil(durationSec / 60) : 0;
  const timelineSec = extractMaxTimestampSeconds(transcriptText);
  const durationMinutesFromTranscript = timelineSec > 0 ? Math.ceil(timelineSec / 60) : 0;

  if (source === 'audio_upload' || source === 'recording' || source === 'video_url') {
    const best = Math.max(durationMinutesFromField, durationMinutesFromTranscript);
    if (best > 0) return Math.max(1, best);
    return estimateMinutesFromText(transcriptText);
  }

  if (source === 'text' || source === 'pasted_text' || source === 'images' || source === 'image_ocr') {
    return estimateMinutesFromText(transcriptText);
  }

  const bestDefault = Math.max(durationMinutesFromField, durationMinutesFromTranscript);
  return bestDefault > 0 ? Math.max(1, bestDefault) : estimateMinutesFromText(transcriptText);
}

Deno.serve(async (req) => {
  let sessionId = null;
  let base44Client = null;

  try {
    const base44 = createClientFromRequest(req);
    base44Client = base44;
    const body = await req.json();

    sessionId = body.session_id || body.event?.entity_id || body.data?.id;
    if (!sessionId) {
      return Response.json({ error: 'session_id is required' }, { status: 400 });
    }

    const session = await base44.asServiceRole.entities.Session.get(sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const forceTranscribe = body.force_transcribe === true;
    const hasTranscriptSignal = !!(session.transcript_text && String(session.transcript_text).trim()) || !!session.transcript_file_url;
    const canAnalyzeOnly = session.processing_status === 'transcript_ready' && hasTranscriptSignal;

    if (!forceTranscribe && session.processing_status !== 'pending' && !canAnalyzeOnly) {
      return Response.json({
        skipped: true,
        reason: `No-op for status=${session.processing_status}`,
      });
    }

    if (!session.audio_file_url && !hasTranscriptSignal && !session.video_url && (!session.image_urls || session.image_urls.length === 0)) {
      await base44.asServiceRole.entities.Session.update(sessionId, { processing_status: 'failed' });
      return Response.json({ skipped: true, reason: 'No content to process' });
    }

    const isSubsession = session.is_subsession === true;
    const skipAIAnalysis = isSubsession;

    let aiSettings = null;
    try {
      const settingsRecords = await base44.asServiceRole.entities.AISettings.filter({ setting_key: 'global' });
      aiSettings = settingsRecords?.[0] || null;
    } catch (e) {
      console.warn('Could not load AISettings, using defaults:', e?.message || e);
    }

    const transcriptionProvider = aiSettings?.full_retranscription?.primary || 'base44';
    const analysisProvider = aiSettings?.ai_analysis?.primary || 'base44';

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY');

    const invokeLLM = (params) => {
      if (analysisProvider !== 'base44' && openaiKey) {
        return fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: params.prompt }],
            ...(params.response_json_schema ? { response_format: { type: 'json_object' } } : {}),
          }),
        })
          .then((r) => r.json())
          .then((r) => {
            const content = r.choices?.[0]?.message?.content || '';
            if (params.response_json_schema) {
              try {
                return JSON.parse(content);
              } catch {
                return {};
              }
            }
            return content;
          });
      }
      return base44.asServiceRole.integrations.Core.InvokeLLM(params);
    };

    let transcriptText = '';

    if (canAnalyzeOnly && !forceTranscribe) {
      transcriptText = await loadTranscriptFromSession(session);
      if (!transcriptText.trim()) {
        return Response.json({ skipped: true, reason: 'transcript_ready but transcript missing' });
      }
    } else {
      await base44.asServiceRole.entities.Session.update(sessionId, { processing_status: 'transcribing' });

      transcriptText = String(session.transcript_text || '');
      const audioUrl = session.audio_file_url;
      const liveWordCount = transcriptText.split(/\s+/).filter((w) => w).length;

      if ((forceTranscribe || liveWordCount < 10) && audioUrl) {
        try {
          if (transcriptionProvider === 'openai_whisper' && openaiKey) {
            console.log('Transcribing with OpenAI Whisper');
            const transcribed = await transcribeWithWhisper(audioUrl, openaiKey);
            if (transcribed) transcriptText = transcribed;
          } else if (assemblyAIKey) {
            console.log('Submitting AssemblyAI job (async)');
            const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
              method: 'POST',
              headers: { Authorization: assemblyAIKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio_url: audioUrl,
                speaker_labels: true,
                speech_models: ['universal-3-pro', 'universal-2'],
                language_detection: true,
                webhook_url: `https://api.base44.com/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/assemblyAIWebhook`,
              }),
            });

            if (!submitRes.ok) throw new Error(`AssemblyAI submit error: ${await submitRes.text()}`);
            const submitData = await submitRes.json();
            if (!submitData.id) throw new Error('AssemblyAI did not return a job ID');

            await base44.asServiceRole.entities.Session.update(sessionId, {
              processing_status: 'transcribing',
              assemblyai_job_id: submitData.id,
            });

            return Response.json({
              success: true,
              session_id: sessionId,
              assemblyai_job_id: submitData.id,
              status: 'transcribing',
            });
          } else if (openaiKey) {
            console.log('Transcribing with OpenAI Whisper (fallback)');
            const transcribed = await transcribeWithWhisper(audioUrl, openaiKey);
            if (transcribed) transcriptText = transcribed;
          } else {
            console.warn('No transcription API key available');
          }
        } catch (e) {
          console.warn('Transcription failed:', e?.message || e);
        }
      }

      if (!transcriptText.trim() && hasTranscriptSignal) {
        transcriptText = await loadTranscriptFromSession(session);
      }

      if (transcriptText.trim()) {
        const transcriptUpdateFields = await buildTranscriptUpdateFields(base44, sessionId, transcriptText);
        const langMixPre = detectLanguageMix(transcriptText);
        const dialectPre = detectDialectSimple(transcriptText);

        await base44.asServiceRole.entities.Session.update(sessionId, {
          ...transcriptUpdateFields,
          transcript_language: langMixPre.dominantLanguage,
          is_multilingual: langMixPre.isMultilingual,
          ...(dialectPre.isArabic ? { dialect: dialectPre.dialect, dialect_label: dialectPre.label } : {}),
          assemblyai_job_id: null,
          processing_status: skipAIAnalysis ? 'done' : 'transcript_ready',
        });

        if (skipAIAnalysis) {
          return Response.json({ success: true, session_id: sessionId, status: 'done', reason: 'subsession_skip_analysis' });
        }
      }
    }

    // ── Hydrate full transcript from file if current text is truncated ──
    if (isTruncatedPreview(transcriptText) && session?.transcript_file_url) {
      const fullFromFile = await loadTranscriptFromSession(session);
      if (fullFromFile && fullFromFile.trim()) {
        transcriptText = fullFromFile.trim();
      }
    }

    if (!transcriptText.trim()) {
      return Response.json({ skipped: true, reason: 'No transcript available for analysis' });
    }

    await base44.asServiceRole.entities.Session.update(sessionId, { processing_status: 'analyzing' });

    // ── Freeze raw transcript BEFORE any LLM normalization ──
    const billingTranscriptText = transcriptText;

    const langMix = detectLanguageMix(transcriptText);
    let originalTranscriptText = null;
    let isMultilingual = false;
    let transcriptLanguage = langMix.dominantLanguage;

    if (langMix.isMultilingual) {
      isMultilingual = true;
      originalTranscriptText = transcriptText;

      const targetLangName = langMix.dominantLanguage === 'ar' ? 'Arabic' : 'English';
      try {
        const normalizeRes = await invokeLLM({
          prompt: `The following transcript contains mixed languages (Arabic and English). Normalize it entirely to ${targetLangName}.
Rules:
- Preserve ALL [MM:SS] timestamps exactly as they are
- Preserve speaker labels (e.g. "Speaker 1:", "Ahmed:") exactly
- Translate only the spoken text content to ${targetLangName}
- Do not add any explanation or commentary
- Keep the exact same line structure

Transcript to normalize:
${transcriptText}`,
        });
        if (normalizeRes && typeof normalizeRes === 'string' && normalizeRes.trim()) {
          transcriptText = normalizeRes.trim();
        }
      } catch (e) {
        console.warn('Language normalization failed, keeping original:', e?.message || e);
        originalTranscriptText = null;
        isMultilingual = false;
      }
    }

    const dialectResult = detectDialectSimple(transcriptText);
    const transcriptSample = transcriptText.slice(0, 3000);
    const langInstruction = transcriptLanguage === 'ar' ? 'Respond entirely in Arabic.' : 'Respond entirely in English.';

    let tags = [];
    let summaryText = '';
    let generatedTitle = session.title;
    let sessionType = null;

    if (!skipAIAnalysis) {
      const manualNotesContext =
        session.manual_notes && session.manual_notes.length > 0
          ? `\n\nManual Notes Added During Recording:\n${session.manual_notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
          : '';

      try {
        const [tagRes, summaryRes, titleRes] = await Promise.allSettled([
          invokeLLM({
            prompt: `Extract 3 to 5 short, relevant keyword tags from this transcript. ${langInstruction} Return only the tags as a JSON array of strings.\n\nTranscript:\n${transcriptSample}${manualNotesContext}`,
            response_json_schema: { type: 'object', properties: { tags: { type: 'array', items: { type: 'string' } } } },
          }),
          invokeLLM({
            prompt: `Write a concise summary (3-5 bullet points) of the key points from this transcript. ${langInstruction} Incorporate insights from the manual notes if provided. Format each bullet starting with "• ". Return as JSON.\n\nTranscript:\n${transcriptSample}${manualNotesContext}`,
            response_json_schema: { type: 'object', properties: { summary: { type: 'string' }, session_type: { type: 'string' } } },
          }),
          invokeLLM({
            prompt: `Based on the following transcript, generate a short descriptive title (max 8 words) that captures the main topic. ${langInstruction} Return as JSON.\n\nTranscript:\n${transcriptSample}${manualNotesContext}`,
            response_json_schema: { type: 'object', properties: { title: { type: 'string' } } },
          }),
        ]);

        if (tagRes.status === 'fulfilled') tags = tagRes.value?.tags || [];
        if (summaryRes.status === 'fulfilled') {
          summaryText = summaryRes.value?.summary || '';
          sessionType = summaryRes.value?.session_type || null;
        }
        if (titleRes.status === 'fulfilled' && titleRes.value?.title) {
          generatedTitle = titleRes.value.title;
        }
      } catch (aiError) {
        console.warn('AI processing error (continuing with best effort):', aiError?.message || aiError);
      }
    }

    // Deduct ONCE per session (idempotent) — only for main sessions
    if (!session.usage_charged_at) {
      try {
        const billableMinutes = computeBillableMinutes(session, billingTranscriptText);
        await base44.asServiceRole.functions.invoke('deductMinutes', {
          minutes: billableMinutes,
          session_id: sessionId,
          user_email: session.user_email,
          charge_key: `${sessionId}:${session.assemblyai_job_id || 'final'}`,
        });
      } catch (chargeErr) {
        console.warn(`Minute deduction failed for session ${sessionId}:`, chargeErr?.message || chargeErr);
      }
    }

    // Duration computed from all available signals
    const timelineSeconds = extractMaxTimestampSeconds(billingTranscriptText);
    const fallbackSecondsFromWords = estimateMinutesFromText(billingTranscriptText) * 60;

    const finalDuration = Math.max(
      Number(session?.duration || 0),
      timelineSeconds,
      fallbackSecondsFromWords
    );

    await base44.asServiceRole.entities.Session.update(sessionId, {
      processing_status: 'done',
      title: generatedTitle,
      duration: finalDuration,
      transcript_language: transcriptLanguage,
      is_multilingual: isMultilingual,
      ...(originalTranscriptText ? { original_transcript_text: originalTranscriptText } : {}),
      ...(summaryText ? { summary_text: summaryText } : {}),
      ...(tags.length ? { tags } : {}),
      ...(sessionType ? { session_type: sessionType } : {}),
      ...(dialectResult.isArabic ? { dialect: dialectResult.dialect, dialect_label: dialectResult.label } : {}),
    });

    return Response.json({
      success: true,
      session_id: sessionId,
      transcription_provider: transcriptionProvider,
      analysis_provider: analysisProvider,
      status: 'done',
    });
  } catch (error) {
    console.error('processSessionBackground error:', error?.message || error);
    if (sessionId && base44Client) {
      try {
        await base44Client.asServiceRole.entities.Session.update(sessionId, { processing_status: 'failed' });
      } catch (failureError) {
        console.error('Failed to mark session as failed:', failureError?.message || failureError);
      }
    }
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});