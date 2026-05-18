import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { User } from "../models/index.js";

export function attachUser(req, _res, next) {
  const raw = req.headers.authorization || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, config.jwtSecret);
  } catch {
    req.user = null;
  }
  return next();
}

export function requireAuth(req, res, next) {
  if (!req.user?.email) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
  }
  return next();
}

/** Load full user doc from DB onto req.dbUser */
export async function loadDbUser(req, res, next) {
  if (!req.user?.email) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
  }
  try {
    const doc = await User.findOne({ email: req.user.email }).lean();
    if (!doc) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found" } });
    }
    if (doc.status === "disabled") {
      return res.status(403).json({ error: { code: "ACCOUNT_DISABLED", message: "Account is disabled" } });
    }
    req.dbUser = doc;
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireRole(...roles) {
  const allowed = new Set(roles);
  return async (req, res, next) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    }
    const role = normalizeRole(req.dbUser.role);
    if (!allowed.has(role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
    }
    return next();
  };
}

/** Legacy admin string maps to system_admin */
export function normalizeRole(role) {
  if (role === "admin") return "system_admin";
  return role || "member";
}

export function isOrgAdminRole(role) {
  const r = normalizeRole(role);
  return r === "org_admin" || r === "system_admin";
}

export function isSystemAdminRole(role) {
  return normalizeRole(role) === "system_admin";
}
