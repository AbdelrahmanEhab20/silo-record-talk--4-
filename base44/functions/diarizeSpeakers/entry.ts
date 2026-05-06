import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transcript } = await req.json();
    if (!transcript) return Response.json({ error: 'transcript is required' }, { status: 400 });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert speaker diarization system. Analyze a transcript and assign speaker labels to each segment using linguistic and conversational cues as proxies for acoustic differences.

Detection signals to use:
- Turn-taking patterns: question → answer, statement → response
- Vocabulary & style shifts: formal vs casual, technical vs layman
- Topic initiations vs responses
- Self-introductions or being addressed by name (e.g. "Thanks Ahmed", "I'm Sarah", "As John mentioned")
- Interruptions, affirmations ("Yes", "Right", "Exactly"), filler words unique to a speaker
- Sentence length patterns — short punchy vs long elaborate
- Language switches or accent markers in spelling

Rules:
1. Assign "Speaker 1", "Speaker 2", etc. in order of first appearance
2. If a real name is mentioned (e.g. "Hi I'm Ahmed", "Thanks Sarah"), use that name instead of the label
3. Preserve ALL original [MM:SS] timestamps exactly — do not modify or remove them
4. Output format per line: [MM:SS] SpeakerName: text
5. Be consistent — once a speaker is identified, never change their label for the rest of the transcript
6. Even single-speaker transcripts must label lines as "Speaker 1: ..."
7. Do not add any explanation, commentary, or headers — output ONLY the labeled transcript

If the transcript already has speaker labels, re-analyze and correct any inconsistencies.`
        },
        {
          role: 'user',
          content: `Diarize this transcript:\n\n${transcript}`
        }
      ],
      temperature: 0.1,
    });

    const diarized = response.choices[0].message.content.trim();
    return Response.json({ transcript: diarized });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});