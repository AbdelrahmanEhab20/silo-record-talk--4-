import { config } from "../config/index.js";
import { getDeploymentSettings } from "./deploymentSettings.js";
import { sendUserInviteEmail } from "./email/emailService.js";

function formatExpiryDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function inviterDisplayName(dbUser) {
  return dbUser.full_name?.trim() || dbUser.email;
}

export async function sendInviteEmailForUser({ invite, token, inviter }) {
  const settings = await getDeploymentSettings();
  const inviteUrl = `${config.frontendUrl}/accept-invite?token=${token}`;
  const expiresAt = formatExpiryDate(invite.expires_at);

  return sendUserInviteEmail({
    to: invite.email,
    vars: {
      email: invite.email,
      inviteUrl,
      inviterName: inviterDisplayName(inviter),
      role: invite.role,
      expiresAt,
    },
  });
}
