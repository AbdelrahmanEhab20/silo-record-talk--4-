import Swal from "sweetalert2";

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

function themeColors() {
  const dark = isDarkMode();
  return {
    background: dark ? "#1C1C1E" : "#FFFFFF",
    color: dark ? "#FFFFFF" : "#111827",
    confirmButton: "#6366F1",
    cancelButton: dark ? "#3A3A3C" : "#E5E7EB",
    cancelColor: dark ? "#FFFFFF" : "#374151",
    dangerButton: "#EF4444",
  };
}

const baseOptions = () => {
  const t = themeColors();
  return {
    background: t.background,
    color: t.color,
    buttonsStyling: true,
    customClass: {
      popup: "silo-swal-popup",
      title: "silo-swal-title",
      htmlContainer: "silo-swal-text",
      confirmButton: "silo-swal-btn silo-swal-btn-confirm",
      cancelButton: "silo-swal-btn silo-swal-btn-cancel",
      denyButton: "silo-swal-btn silo-swal-btn-cancel",
    },
    confirmButtonColor: t.confirmButton,
    cancelButtonColor: t.cancelButton,
  };
};

/**
 * Confirmation dialog (replaces window.confirm).
 * @returns {Promise<boolean>}
 */
export async function siloConfirm({
  title,
  text,
  html,
  confirmText = "Confirm",
  cancelText = "Cancel",
  icon = "question",
  danger = false,
}) {
  const t = themeColors();
  const result = await Swal.fire({
    ...baseOptions(),
    title,
    text: html ? undefined : text,
    html,
    icon,
    showCancelButton: true,
    focusCancel: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? t.dangerButton : t.confirmButton,
    reverseButtons: true,
  });
  return result.isConfirmed === true;
}

/**
 * Alert dialog (replaces window.alert).
 */
export async function siloAlert({ title, text, icon = "info", confirmText = "OK" }) {
  await Swal.fire({
    ...baseOptions(),
    title,
    text,
    icon,
    confirmButtonText: confirmText,
  });
}

export async function siloSuccess(title, text) {
  await siloAlert({ title, text, icon: "success", confirmText: "Done" });
}

export async function siloError(title, text) {
  await siloAlert({
    title: title || "Something went wrong",
    text,
    icon: "error",
    confirmText: "OK",
  });
}

/** Log out confirmation — Silo branded */
export async function siloConfirmLogout() {
  return siloConfirm({
    title: "Log out?",
    text: "You will need to sign in again to access your account.",
    confirmText: "Log out",
    cancelText: "Stay signed in",
    icon: "warning",
    danger: false,
  });
}

/** Delete account — two-step */
export async function siloConfirmDeleteAccount() {
  const step1 = await siloConfirm({
    title: "Delete account?",
    html:
      '<p style="margin:0;line-height:1.5;">All your sessions and data will be permanently deleted. This cannot be undone.</p>',
    confirmText: "Continue",
    cancelText: "Cancel",
    icon: "warning",
    danger: true,
  });
  if (!step1) return false;
  return siloConfirm({
    title: "Are you absolutely sure?",
    text: "This action is irreversible.",
    confirmText: "Delete forever",
    cancelText: "Go back",
    icon: "error",
    danger: true,
  });
}
