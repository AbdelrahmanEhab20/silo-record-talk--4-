import { renderUserInvite } from "./templates/userInvite.js";

const templates = {
  user_invite: {
    required: ["email", "inviteUrl", "inviterName", "role", "expiresAt"],
    render: renderUserInvite,
  },
};

export function renderTemplate(name, vars, branding) {
  const tpl = templates[name];
  if (!tpl) throw new Error(`Unknown email template: ${name}`);
  for (const key of tpl.required) {
    if (vars[key] == null || vars[key] === "") {
      throw new Error(`Missing template variable: ${key}`);
    }
  }
  return tpl.render(vars, branding);
}
