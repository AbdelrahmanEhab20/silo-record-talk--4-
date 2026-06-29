import { config } from "../../config/index.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_BASE = "https://api.openai.com/v1";
const GROQ_BASE = "https://api.groq.com/openai/v1";

function hasGroq() {
  return Boolean(config.groqApiKey);
}

function hasGemini() {
  return Boolean(config.geminiApiKey);
}

function hasOpenAI() {
  return Boolean(config.openaiApiKey);
}

export function isLlmAvailable() {
  return hasGroq() || hasGemini() || hasOpenAI();
}

function extractJson(text) {
  if (!text) return null;
  const trimmed = String(text).trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  return null;
}

/** Groq/OpenAI require the word "json" in prompts when using response_format json_object. */
function ensureJsonPrompt(prompt) {
  const text = String(prompt || "");
  if (/json/i.test(text)) return text;
  return `Respond with valid JSON only.\n\n${text}`;
}

async function callGemini({ prompt, json }) {
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(config.geminiModel)}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: json
      ? { temperature: 0.3, response_mime_type: "application/json" }
      : { temperature: 0.4 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": config.geminiApiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return json ? extractJson(text) : text;
}

async function callOpenAIChat({ baseUrl, apiKey, model, prompt, json, providerLabel }) {
  const content = json ? ensureJsonPrompt(prompt) : prompt;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      temperature: json ? 0.3 : 0.4,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${providerLabel} API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return json ? extractJson(content) : content;
}

async function callGroq({ prompt, json }) {
  return callOpenAIChat({
    baseUrl: GROQ_BASE,
    apiKey: config.groqApiKey,
    model: config.groqModel,
    prompt,
    json,
    providerLabel: "Groq",
  });
}

async function callOpenAI({ prompt, json }) {
  return callOpenAIChat({
    baseUrl: OPENAI_BASE,
    apiKey: config.openaiApiKey,
    model: "gpt-4o-mini",
    prompt,
    json,
    providerLabel: "OpenAI",
  });
}

/**
 * Provider-agnostic LLM invocation. Returns text or parsed JSON object.
 * Throws when no provider configured.
 */
export async function invokeLLM({ prompt, json = false }) {
  if (hasGroq()) {
    console.log(`[invoke-llm] provider=groq model=${config.groqModel}`);
    return callGroq({ prompt, json });
  }
  if (hasGemini()) {
    console.log(`[invoke-llm] provider=gemini model=${config.geminiModel}`);
    return callGemini({ prompt, json });
  }
  if (hasOpenAI()) {
    console.log("[invoke-llm] provider=openai model=gpt-4o-mini");
    return callOpenAI({ prompt, json });
  }
  throw new Error("No LLM provider configured (set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY)");
}

const ANALYSIS_PROMPT = (transcript, language) => `You are a meeting/recording analyst. Analyse the transcript below.
Respond ENTIRELY in ${language === "ar" ? "Arabic" : "English"}.
Return STRICT JSON matching this schema:
{
  "title": string (<= 8 words, descriptive),
  "summary": string (3-5 bullet points, each starting with "\u2022 "),
  "tags": string[] (3-5 short topical keywords, lowercase),
  "action_items": [{"text": string, "owner": string|null, "deadline": string|null}],
  "session_type": string|null
}

Transcript:
${transcript}`;

/**
 * Analyse a transcript into a structured insight object.
 * Returns null when no LLM is configured (caller should treat as no-op).
 */
export async function analyzeTranscript({ transcript, language = "en" }) {
  if (!isLlmAvailable()) return null;
  const sample = String(transcript || "").slice(0, 12000);
  if (!sample.trim()) return null;
  try {
    const parsed = await invokeLLM({ prompt: ANALYSIS_PROMPT(sample, language), json: true });
    if (!parsed || typeof parsed !== "object") return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title.trim() : "",
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === "string").slice(0, 8) : [],
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items.slice(0, 20) : [],
      session_type: typeof parsed.session_type === "string" ? parsed.session_type : null,
    };
  } catch (err) {
    console.error("[llm] analyzeTranscript failed:", err.message);
    return null;
  }
}

export function detectLanguage(text) {
  const arabicChars = (String(text || "").match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (String(text || "").match(/[a-zA-Z]/g) || []).length;
  const total = arabicChars + latinChars;
  if (total === 0) return "en";
  return arabicChars / total > 0.5 ? "ar" : "en";
}
