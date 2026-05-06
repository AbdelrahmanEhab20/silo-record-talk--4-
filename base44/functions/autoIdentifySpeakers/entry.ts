import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Fetch the current session
    const session = await base44.entities.Session.get(sessionId);
    if (!session || session.user_email !== user.email) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch all user's sessions to extract speaker patterns
    const allSessions = await base44.entities.Session.filter({ user_email: user.email }, '-updated_date', 100);
    
    // Extract speaker mappings and naming patterns
    const speakerPatterns = {};
    const allMappings = {};
    
    allSessions.forEach(s => {
      if (s.speaker_mapping && typeof s.speaker_mapping === 'object') {
        Object.entries(s.speaker_mapping).forEach(([original, mapped]) => {
          allMappings[mapped] = (allMappings[mapped] || 0) + 1;
          if (!speakerPatterns[mapped]) {
            speakerPatterns[mapped] = [];
          }
        });
      }
    });

    // Get transcript speakers (Speaker 1, Speaker 2, etc.)
    const transcript = session.transcript_text || '';
    const speakerRegex = /Speaker (\d+):/g;
    const speakers = new Set();
    let match;
    while ((match = speakerRegex.exec(transcript)) !== null) {
      speakers.add(`Speaker ${match[1]}`);
    }

    // If no unmapped speakers, return empty
    if (speakers.size === 0) {
      return Response.json({ suggestions: {} });
    }

    const existingMapping = session.speaker_mapping || {};
    const unmappedSpeakers = Array.from(speakers).filter(s => !existingMapping[s]);
    
    if (unmappedSpeakers.length === 0) {
      return Response.json({ suggestions: {} });
    }

    // Build learning context
    const learningContext = `
Based on these historical speaker patterns from previous sessions:
${Object.entries(speakerPatterns)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([name]) => `- ${name}`)
  .join('\n')}

And these common naming conventions observed:
${Array.from(new Set(
  Object.keys(speakerPatterns)
    .filter(n => n.length > 0)
    .map(n => {
      if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(n)) return 'Full names (FirstName LastName)';
      if (/^[A-Z][a-z]+$/.test(n)) return 'First names only';
      if (/[A-Z]{2,}/.test(n)) return 'Acronyms or initials';
      return null;
    })
    .filter(Boolean)
)).join('\n')}

Analyze the transcript segments to suggest appropriate speaker names.`;

    // Extract transcript segments for each speaker
    const speakerSegments = {};
    unmappedSpeakers.forEach(speaker => {
      const regex = new RegExp(`${speaker}:\\s*([^]*?)(?=Speaker \\d+:|$)`, 'g');
      const matches = transcript.match(new RegExp(`${speaker}:\\s*(.{0,200})`));
      if (matches) {
        speakerSegments[speaker] = matches[1].substring(0, 300);
      }
    });

    // Use LLM to suggest speaker names
    const prompt = `${learningContext}

Current session transcript segments:
${Object.entries(speakerSegments)
  .map(([speaker, segment]) => `${speaker}: "${segment}..."`)
  .join('\n\n')}

Based on the conversation patterns, context, and historical naming conventions, suggest realistic speaker names for each unmapped speaker. Return ONLY a JSON object with speaker labels as keys and suggested names as values. Example: {"Speaker 1": "Ahmed Hassan", "Speaker 2": "Sarah Mitchell"}

If you cannot determine appropriate names from context, use common business/professional names that fit the conversation pattern.`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        additionalProperties: { type: 'string' }
      }
    });

    // Validate and filter suggestions
    const suggestions = {};
    Object.entries(llmResponse || {}).forEach(([speaker, name]) => {
      if (unmappedSpeakers.includes(speaker) && name && typeof name === 'string' && name.length > 0) {
        suggestions[speaker] = name.trim();
      }
    });

    return Response.json({ suggestions });
  } catch (error) {
    console.error('Speaker identification error:', error);
    return Response.json({ error: error.message, suggestions: {} }, { status: 500 });
  }
});