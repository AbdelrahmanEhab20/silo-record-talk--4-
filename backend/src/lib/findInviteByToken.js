import { Invite } from "../models/index.js";
import { tokenLookup, verifyInviteToken } from "./inviteToken.js";

export async function findInviteByToken(token) {
  if (!token) return null;
  const now = new Date();
  const baseFilter = {
    accepted_at: null,
    revoked_at: null,
    expires_at: { $gt: now },
  };

  const lookup = tokenLookup(token);
  const direct = await Invite.findOne({ ...baseFilter, token_lookup: lookup }).lean();
  if (direct && (await verifyInviteToken(token, direct.token_hash))) {
    return direct;
  }

  // Legacy invites created before token_lookup existed
  const legacy = await Invite.find({
    ...baseFilter,
    $or: [{ token_lookup: { $exists: false } }, { token_lookup: null }, { token_lookup: "" }],
  }).lean();
  for (const inv of legacy) {
    if (await verifyInviteToken(token, inv.token_hash)) {
      await Invite.updateOne({ _id: inv._id }, { $set: { token_lookup: lookup } }).catch(() => {});
      return inv;
    }
  }
  return null;
}
