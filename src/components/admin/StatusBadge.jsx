const STYLES = {
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  invited: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  disabled: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

const LABELS = {
  active: "Active",
  invited: "Invited",
  disabled: "Disabled",
};

export default function StatusBadge({ status }) {
  const key = status || "active";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${STYLES[key] || STYLES.active}`}
    >
      {LABELS[key] || key}
    </span>
  );
}
