import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transcript, summary, title } = await req.json();

    if (!transcript && !summary) {
      return Response.json({ error: 'Transcript or summary required' }, { status: 400 });
    }

    const content = transcript || summary;
    const prompt = `You are an expert educational content creator specializing in flashcards for students.

Based on the following session content, create 8-12 high-quality flashcards suitable for studying and learning.

SESSION TITLE: ${title || 'Session'}

CONTENT:
${content.slice(0, 5000)}

Create flashcards with:
1. Clear, concise "front" (question/term) - 5-15 words max
2. Detailed "back" (answer/explanation) - 30-100 words
3. A "visual_hint" for potential visuals (emoji or short description)
4. A "category" to group related flashcards

Format as a JSON array. Focus on key concepts, definitions, formulas, important dates, and practical takeaways that students would need to remember.`;

    const flashcards = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          flashcards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
                visual_hint: { type: "string" },
                category: { type: "string" }
              },
              required: ["front", "back"]
            }
          }
        },
        required: ["flashcards"]
      }
    });

    return Response.json(flashcards);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});