import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

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
