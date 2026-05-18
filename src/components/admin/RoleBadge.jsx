const STYLES = {
  member: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25",
  org_admin: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  system_admin: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
};

const LABELS = {
  member: "Member",
  org_admin: "Org admin",
  system_admin: "System admin",
};

export default function RoleBadge({ role }) {
  const key = role === "admin" ? "system_admin" : role || "member";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STYLES[key] || STYLES.member}`}
    >
      {LABELS[key] || key}
    </span>
  );
}
