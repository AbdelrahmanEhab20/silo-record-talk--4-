import { escapeHtml } from "../escapeHtml.js";

/**
 * Table-based email layout (inline CSS, ~600px) for client compatibility.
 */
export function renderBaseLayout({ title, bodyHtml, branding = {} }) {
  const appName = escapeHtml(branding.appName || "Silo");
  const logoUrl = branding.logoUrl ? escapeHtml(branding.logoUrl) : "";
  const primary = escapeHtml(branding.primaryColor || "#6366F1");
  const supportEmail = branding.supportEmail ? escapeHtml(branding.supportEmail) : "";

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${appName}" width="160" style="display:block;max-width:160px;height:auto;margin:0 auto 24px;" />`
    : `<p style="margin:0 0 24px;font-size:22px;font-weight:700;color:${primary};text-align:center;">${appName}</p>`;

  const footerSupport = supportEmail
    ? `<p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Questions? <a href="mailto:${supportEmail}" style="color:${primary};">${supportEmail}</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:40px 32px 24px;text-align:center;">
              ${logoBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;color:#111827;font-size:16px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} ${appName}</p>
              ${footerSupport}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
