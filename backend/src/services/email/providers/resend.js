import { Resend } from "resend";
import { config } from "../../../config/index.js";

export async function sendViaResend({ to, subject, html, text, from, replyTo }) {
  if (!config.resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const resend = new Resend(config.resendApiKey);
  const result = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
    text,
    ...(replyTo ? { reply_to: replyTo } : {}),
  });
  if (result.error) {
    throw new Error(result.error.message || "Resend send failed");
  }
  return { provider_id: result.data?.id || "resend", status: "sent" };
}
