import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const { checkAppState } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextPath = useMemo(() => {
    const fromState = location.state?.from;
    const fromQuery = new URLSearchParams(location.search).get("next");
    return fromState || fromQuery || "/home";
  }, [location]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await appClient.auth.login(email.trim().toLowerCase(), password);
      await checkAppState();
      navigate(nextPath, { replace: true });
    } catch (err) {
      const code = err?.data?.error?.code;
      if (code === "INVITE_PENDING") {
        setError("Please open the invitation link in your email to set your password first.");
      } else {
        setError(err?.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const bg = isDark ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F7] text-gray-900";
  const card = isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200";
  const input = isDark
    ? "bg-black/30 border-white/10 text-white placeholder:text-white/40"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400";

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${bg}`}>
      <div className={`w-full max-w-md rounded-2xl border p-6 ${card}`}>
        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className={`text-sm mb-6 ${isDark ? "text-white/60" : "text-gray-500"}`}>
          Sign in with your email and password.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Email</label>
            <input
              type="email"
              className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 ${input}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Password</label>
            <input
              type="password"
              className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 ${input}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 font-semibold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1, #22D3EE)" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
