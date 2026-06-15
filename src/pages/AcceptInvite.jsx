import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { setAuthToken } from "@/api/nodeBackendClient";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";
import PasswordInput from "@/components/ui/PasswordInput";
import PoweredBy from "@/components/PoweredBy";

const ROLE_LABELS = {
  member: "Member",
  org_admin: "Organization admin",
  system_admin: "System administrator",
};

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { checkAppState } = useAuth();
  const token = searchParams.get("token") || "";

  const [inviteInfo, setInviteInfo] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const appName = inviteInfo?.public_settings?.app_name || "Silo";

  useEffect(() => {
    // Clear any previous session so accept-invite is not sent with an old admin JWT
    setAuthToken(null);

    if (!token) {
      setLoadError("Missing invitation token. Check the link in your email.");
      setLoadingInfo(false);
      return;
    }
    (async () => {
      try {
        const info = await appClient.auth.getInviteInfo(token);
        setInviteInfo(info);
      } catch (e) {
        setLoadError(e.message || "Invitation is invalid or has expired.");
      } finally {
        setLoadingInfo(false);
      }
    })();
  }, [token]);

  const expiresLabel = useMemo(() => {
    if (!inviteInfo?.expires_at) return "";
    return new Date(inviteInfo.expires_at).toLocaleDateString(undefined, {
      dateStyle: "long",
    });
  }, [inviteInfo]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await appClient.auth.acceptInvite({ token, password, full_name: fullName.trim() });
      await checkAppState();
      navigate("/home", { replace: true });
    } catch (err) {
      // Account may have been created but the browser lost the response (common on Render)
      if (err?.status === 0 && inviteInfo?.email) {
        try {
          await appClient.auth.login(inviteInfo.email, password);
          await checkAppState();
          navigate("/home", { replace: true });
          return;
        } catch {
          setSubmitError(
            "Your account may already be active. Try signing in from the login page with the password you just set."
          );
          return;
        }
      }
      setSubmitError(err.message || "Could not accept invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const bg = isDark ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F7] text-gray-900";
  const card = isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200";
  const input = isDark
    ? "bg-black/30 border-white/10 text-white placeholder:text-white/40"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400";
  const sub = isDark ? "text-white/60" : "text-gray-500";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-10 ${bg}`}>
      <div className={`w-full max-w-md rounded-2xl border p-6 ${card}`}>
        <h1 className="text-2xl font-bold mb-1">Accept invitation</h1>
        <p className={`text-sm mb-6 ${sub}`}>Join {appName} and set your password.</p>

        {loadingInfo ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin opacity-50" />
          </div>
        ) : loadError ? (
          <p className="text-sm text-red-500">{loadError}</p>
        ) : (
          <>
            <div className={`rounded-xl p-4 mb-6 text-sm ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
              <p className={sub}>
                <span className="font-medium text-inherit">Email:</span> {inviteInfo.email}
              </p>
              <p className={`mt-2 ${sub}`}>
                <span className="font-medium text-inherit">Role:</span>{" "}
                {ROLE_LABELS[inviteInfo.role] || inviteInfo.role}
              </p>
              {expiresLabel && (
                <p className={`mt-2 ${sub}`}>
                  <span className="font-medium text-inherit">Expires:</span> {expiresLabel}
                </p>
              )}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Full name (optional)</label>
                <input
                  type="text"
                  className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 ${input}`}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Password</label>
                <PasswordInput
                  className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 ${input}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Confirm password</label>
                <PasswordInput
                  className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 ${input}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              {submitError && <p className="text-sm text-red-500">{submitError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl py-2.5 font-semibold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--brand-accent, #A855F7), var(--brand-primary, #6366F1))" }}
              >
                {submitting ? "Setting up account…" : "Accept & continue"}
              </button>
            </form>
          </>
        )}
      </div>
      <PoweredBy className="mt-6" />
    </div>
  );
}
