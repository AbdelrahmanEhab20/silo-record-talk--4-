import { escapeHtml } from "../escapeHtml.js";
import { renderBaseLayout } from "../layouts/baseLayout.js";

const ROLE_LABELS = {
  member: "Member",
  org_admin: "Organization admin",
  system_admin: "System administrator",
};

export function renderUserInvite(vars, branding) {
  const appName = branding.appName || "Silo";
  const inviterName = escapeHtml(vars.inviterName || "An administrator");
  const email = escapeHtml(vars.email);
  const roleLabel = escapeHtml(ROLE_LABELS[vars.role] || vars.role || "Member");
  const inviteUrl = escapeHtml(vars.inviteUrl);
  const expiresAt = escapeHtml(vars.expiresAt);
  const primary = branding.primaryColor || "#6366F1";

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">You're invited</h1>
    <p style="margin:0 0 16px;">${inviterName} has invited you to join <strong>${escapeHtml(appName)}</strong> as <strong>${roleLabel}</strong>.</p>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Invitation for: ${email}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">This link expires on ${expiresAt}.</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
      <tr>
        <td style="border-radius:8px;background:${primary};">
          <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">Accept invitation</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">Or copy this link:<br /><a href="${inviteUrl}" style="color:${primary};">${inviteUrl}</a></p>
  `;

  const html = renderBaseLayout({
    title: `Invitation to ${appName}`,
    bodyHtml,
    branding,
  });

  const text = [
    `You've been invited to ${appName}`,
    ``,
    `${vars.inviterName || "An administrator"} invited you as ${ROLE_LABELS[vars.role] || vars.role}.`,
    `Email: ${vars.email}`,
    `Expires: ${vars.expiresAt}`,
    ``,
    `Accept your invitation:`,
    vars.inviteUrl,
  ].join("\n");

  return {
    subject: `${appName} AI — You're invited to join`,
    html,
    text,
  };
}
