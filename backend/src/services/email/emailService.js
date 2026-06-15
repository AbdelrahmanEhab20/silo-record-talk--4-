import { config } from "../../config/index.js";
import { EmailLog } from "../../models/index.js";
import { getDeploymentSettings } from "../deploymentSettings.js";
import { renderTemplate } from "./templateRegistry.js";
import { sendViaConsole } from "./providers/console.js";
import { sendViaResend } from "./providers/resend.js";
import { sendViaSendGrid } from "./providers/sendgrid.js";

const ROLE_LABELS = {
  member: "Member",
  org_admin: "Organization admin",
  system_admin: "System administrator",
};

function formatFromAddress() {
  const name = config.emailFromName || "Silo";
  const addr = config.emailFrom || "onboarding@resend.dev";
  return `${name} <${addr}>`;
}

function buildSendGridDynamicData({ template, vars, branding }) {
  if (template !== "user_invite") return null;
  if (!config.sendGridInviteTemplateId) return null;

  return {
    templateId: config.sendGridInviteTemplateId,
    data: {
      appName: branding.appName,
      inviterName: vars.inviterName || "An administrator",
      email: vars.email,
      role: vars.role,
      roleLabel: ROLE_LABELS[vars.role] || vars.role || "Member",
      inviteUrl: vars.inviteUrl,
      expiresAt: vars.expiresAt,
      currentYear: new Date().getFullYear(),
    },
  };
}

async function deliver({ to, subject, html, text, sendGridTemplate }) {
  const provider = (config.emailProvider || "console").toLowerCase();
  const from = formatFromAddress();
  const replyTo = config.emailReplyTo || undefined;

  if (provider === "sendgrid") {
    return sendViaSendGrid({
      to,
      subject,
      html,
      text,
      from,
      replyTo,
      templateId: sendGridTemplate?.templateId,
      dynamicTemplateData: sendGridTemplate?.data,
    });
  }
  if (provider === "resend") {
    return sendViaResend({ to, subject, html, text, from, replyTo });
  }
  return sendViaConsole({ to, subject, text });
}

async function logEmail({ to, template, subject, status, provider_id, error }) {
  try {
    await EmailLog.create({
      to,
      template,
      subject,
      status,
      provider_id: provider_id || null,
      error: error || null,
      sent_at: status === "sent" ? new Date() : null,
    });
  } catch (e) {
    console.error("[email] failed to write EmailLog:", e.message);
  }
}

export async function sendTemplate({ template, to, vars }) {
  const settings = await getDeploymentSettings();
  const branding = {
    appName: settings.app_name || config.emailFromName || "Silo",
    logoUrl: settings.logo_url || "",
    primaryColor: settings.primary_color || "#6366F1",
    accentColor: settings.accent_color || "#A855F7",
    supportEmail: settings.support_email || config.emailReplyTo || "",
  };

  const { subject, html, text } = renderTemplate(template, vars, branding);
  const sendGridTemplate = buildSendGridDynamicData({ template, vars, branding });

  try {
    const result = await deliver({ to, subject, html, text, sendGridTemplate });
    await logEmail({
      to,
      template,
      subject,
      status: "sent",
      provider_id: result.provider_id,
    });
    return { success: true, provider_id: result.provider_id };
  } catch (err) {
    await logEmail({
      to,
      template,
      subject,
      status: "failed",
      error: err.message,
    });
    throw err;
  }
}

export async function sendUserInviteEmail({ to, vars }) {
  return sendTemplate({ template: "user_invite", to, vars });
}
