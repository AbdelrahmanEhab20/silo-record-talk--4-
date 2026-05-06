import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PROVIDER_ENDPOINTS = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', authHeader: 'Bearer' },
  anthropic: { url: 'https://api.anthropic.com/v1/messages', authHeader: 'x-api-key' },
  google: { url: null }, // handled separately
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', authHeader: 'Bearer' },
  deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', authHeader: 'Bearer' },
  custom: { url: null, authHeader: 'Bearer' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { provider_type, api_key_secret_name, model, base_url } = await req.json();

    if (!api_key_secret_name) {
      return Response.json({ success: false, error: 'API key secret name is required' });
    }

    const apiKey = Deno.env.get(api_key_secret_name);
    if (!apiKey) {
      return Response.json({ success: false, error: `Secret "${api_key_secret_name}" not found. Make sure it's set in Base44 dashboard → Secrets.` });
    }

    const testPrompt = 'Reply with exactly: "OK"';

    if (provider_type === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: testPrompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ success: false, error: data?.error?.message || res.statusText });
      const reply = data?.content?.[0]?.text || 'Connected';
      return Response.json({ success: true, response: reply });
    }

    if (provider_type === 'google') {
      const geminiModel = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: testPrompt }] }] }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ success: false, error: data?.error?.message || res.statusText });
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Connected';
      return Response.json({ success: true, response: reply });
    }

    if (provider_type === 'assemblyai') {
      const res = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: { 'authorization': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({ audio_url: 'https://assembly.ai/sports_injuries.mp3' }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ success: false, error: data?.error || res.statusText });
      return Response.json({ success: true, response: `Connected — job id: ${data.id}` });
    }

    // OpenAI-compatible (openai, groq, deepseek, custom)
    const endpoint = base_url
      ? `${base_url.replace(/\/$/, '')}/chat/completions`
      : (PROVIDER_ENDPOINTS[provider_type]?.url || 'https://api.openai.com/v1/chat/completions');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        max_tokens: 10,
        messages: [{ role: 'user', content: testPrompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ success: false, error: data?.error?.message || res.statusText });
    const reply = data?.choices?.[0]?.message?.content || 'Connected';
    return Response.json({ success: true, response: reply });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});