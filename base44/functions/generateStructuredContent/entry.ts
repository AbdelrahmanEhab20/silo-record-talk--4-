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
    const prompt = `You are an expert at organizing information into clear, well-structured educational notes.

Transform the following session content into highly organized study notes with clear hierarchy, detailed explanations, and actionable insights.

SESSION TITLE: ${title || 'Session'}

CONTENT:
${content.slice(0, 6000)}

Create structured notes with:
1. A main title (clear and descriptive)
2. 3-5 major sections, each with:
   - A clear section heading
   - 2-4 key bullet points
   - A detailed explanation (2-3 sentences) for EACH bullet point
3. An "action_items" section with specific takeaways
4. A "key_definitions" section with important terms and definitions

Make it suitable for students to study from. Use clear language, proper formatting, and logical flow.`;

    const structured = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                points: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      bullet: { type: "string" },
                      explanation: { type: "string" }
                    },
                    required: ["bullet", "explanation"]
                  }
                }
              },
              required: ["heading", "points"]
            }
          },
          action_items: {
            type: "array",
            items: { type: "string" }
          },
          key_definitions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                term: { type: "string" },
                definition: { type: "string" }
              },
              required: ["term", "definition"]
            }
          }
        },
        required: ["title", "sections"]
      }
    });

    return Response.json(structured);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});