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
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prompt, system_prompt, messages } = body;

  const endpoint = user?.custom_llm_endpoint?.trim();
  const apiKey = user?.custom_llm_api_key?.trim();
  const model = user?.custom_llm_model?.trim() || 'gpt-3.5-turbo';

  if (!endpoint) {
    return Response.json({ error: 'No custom LLM endpoint configured. Add it in Settings → AI & Speech.' }, { status: 400 });
  }

  // Build messages array - supports raw messages array or prompt/system_prompt
  let chatMessages = messages;
  if (!chatMessages) {
    chatMessages = [];
    if (system_prompt) chatMessages.push({ role: 'system', content: system_prompt });
    if (prompt) chatMessages.push({ role: 'user', content: prompt });
  }

  if (!chatMessages || chatMessages.length === 0) {
    return Response.json({ error: 'No prompt or messages provided' }, { status: 400 });
  }

  // Build request URL — ensure it ends at /chat/completions
  const baseUrl = endpoint.replace(/\/$/, '');
  const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages: chatMessages }),
    });
  } catch (e) {
    return Response.json({ error: 'Network error calling custom LLM: ' + e.message }, { status: 500 });
  }

  if (!response.ok) {
    let errBody = '';
    try { errBody = await response.text(); } catch (_) {}
    return Response.json({ error: `Custom LLM returned ${response.status}`, details: errBody }, { status: 500 });
  }

  let result;
  try {
    result = await response.json();
  } catch (e) {
    return Response.json({ error: 'Failed to parse custom LLM response: ' + e.message }, { status: 500 });
  }

  const content = result?.choices?.[0]?.message?.content || '';
  return Response.json({ result: content, raw: result });
});