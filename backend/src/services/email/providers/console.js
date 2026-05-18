export async function sendViaConsole({ to, subject, text }) {
  console.log("[email:console]", { to, subject, preview: text?.slice(0, 200) });
  return { provider_id: "console", status: "sent" };
}
