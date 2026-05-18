export const ROLES = {
  MEMBER: "member",
  ORG_ADMIN: "org_admin",
  SYSTEM_ADMIN: "system_admin",
};

export function normalizeRole(role) {
  if (role === "admin") return ROLES.SYSTEM_ADMIN;
  return role || ROLES.MEMBER;
}

export function isOrgAdmin(user) {
  const r = normalizeRole(user?.role);
  return r === ROLES.ORG_ADMIN || r === ROLES.SYSTEM_ADMIN;
}

export function isSystemAdmin(user) {
  return normalizeRole(user?.role) === ROLES.SYSTEM_ADMIN;
}
