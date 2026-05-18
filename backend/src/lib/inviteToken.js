import crypto from "crypto";
import bcrypt from "bcryptjs";

export function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function hashInviteToken(token) {
  return bcrypt.hash(token, 12);
}

export async function verifyInviteToken(token, hash) {
  if (!token || !hash) return false;
  return bcrypt.compare(token, hash);
}
