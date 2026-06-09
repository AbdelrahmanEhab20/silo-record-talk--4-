import { config } from "../../../config/index.js";

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

function parseFrom(fromHeader) {
  const m = String(fromHeader || "").match(/^(.*)\s*<\s*(.+)\s*>\s*$/);
  if (m) {
    return { name: m[1].trim(), email: m[2].trim() };
  }
  return { email: String(fromHeader || "").trim() };
}

/**
 * Send via SendGrid. When `templateId` and `dynamicTemplateData` are supplied,
 * the SendGrid Dynamic Template is used (subject/html come from the template).
 * Otherwise falls back to a regular HTML email.
 */
export async function sendViaSendGrid({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
  templateId,
  dynamicTemplateData,
}) {
  if (!config.sendGridApiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }
  const fromObj = parseFrom(from);
  if (!fromObj.email) {
    throw new Error("SendGrid 'from' address missing (set EMAIL_FROM)");
  }

  const personalization = {
    to: [{ email: to }],
  };

  const body = {
    from: fromObj,
    personalizations: [personalization],
  };

  if (templateId) {
    body.template_id = templateId;
    personalization.dynamic_template_data = dynamicTemplateData || {};
  } else {
    personalization.subject = subject;
    body.content = [];
    if (text) body.content.push({ type: "text/plain", value: text });
    if (html) body.content.push({ type: "text/html", value: html });
    if (!body.content.length) {
      throw new Error("SendGrid send requires html or text content");
    }
  }

  if (replyTo) body.reply_to = { email: replyTo };

  const res = await fetch(SENDGRID_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.sendGridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status < 200 || res.status >= 300) {
    const errText = await res.text();
    throw new Error(`SendGrid send failed: ${res.status} ${errText}`);
  }

  const providerId = res.headers.get("x-message-id") || "sendgrid";
  return { provider_id: providerId, status: "sent" };
}
