import { Invite } from "../models/index.js";
import { verifyInviteToken } from "./inviteToken.js";

export async function findInviteByToken(token) {
  if (!token) return null;
  const now = new Date();
  const pending = await Invite.find({
    accepted_at: null,
    revoked_at: null,
    expires_at: { $gt: now },
  }).lean();

  for (const inv of pending) {
    if (await verifyInviteToken(token, inv.token_hash)) {
      return inv;
    }
  }
  return null;
}
