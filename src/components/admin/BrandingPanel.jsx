import React, { useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "@/api/adminApi";
import { appClient } from "@/api/appClient";
import { useAuth } from "@/lib/AuthContext";
import PoweredBy from "@/components/PoweredBy";
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Info,
  Loader2,
  Palette,
  Trash2,
  Upload,
} from "lucide-react";

const LOGO_TYPES = ["image/png", "image/svg+xml", "image/webp"];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const FAVICON_TYPES = [
  "image/png",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];
const FAVICON_MAX_BYTES = 512 * 1024;
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const LOCALE_OPTIONS = [
  { value: "en", label: "English (en)" },
  { value: "ar", label: "Arabic (ar)" },
];

const EMPTY = {
  app_name: "",
  logo_url: "",
  favicon_url: "",
  primary_color: "#6366F1",
  accent_color: "#A855F7",
  support_email: "",
  default_locale: "en",
  email_from_name: "",
};

function pickEditable(doc) {
  if (!doc) return EMPTY;
  return {
    app_name: doc.app_name || "",
    logo_url: doc.logo_url || "",
    favicon_url: doc.favicon_url || "",
    primary_color: doc.primary_color || EMPTY.primary_color,
    accent_color: doc.accent_color || EMPTY.accent_color,
    support_email: doc.support_email || "",
    default_locale: doc.default_locale || "en",
    email_from_name: doc.email_from_name || "",
  };
}

function diff(initial, current) {
  const out = {};
  for (const key of Object.keys(current)) {
    if ((initial?.[key] ?? "") !== (current[key] ?? "")) out[key] = current[key];
  }
  return out;
}

function bytesToHuman(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ColorField({ label, value, onChange, isDark, textSub }) {
  const normalized = HEX_RE.test(value || "") ? value : "";
  return (
    <div>
      <label className={`text-xs font-medium block mb-1 ${textSub}`}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalized || "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className={`w-10 h-10 rounded-xl cursor-pointer border ${
            isDark ? "border-white/10 bg-[#2C2C2E]" : "border-gray-200 bg-white"
          }`}
        />
        <input
          type="text"
          value={value || ""}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366F1"
          className={`flex-1 text-sm font-mono rounded-xl px-3 py-2.5 outline-none transition-colors ${
            isDark
              ? "bg-[#2C2C2E] border border-white/10 text-white placeholder-white/30 focus:border-purple-500/50"
              : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400"
          }`}
        />
      </div>
      {value && !HEX_RE.test(value) && (
        <p className="text-[10px] mt-1 text-amber-500">Use a #RRGGBB hex value.</p>
      )}
    </div>
  );
}

function AssetUploader({
  label,
  hint,
  currentUrl,
  previewUrl,
  uploading,
  onPick,
  onRemove,
  accept,
  square,
  isDark,
  textSub,
}) {
  const inputRef = useRef(null);
  const src = previewUrl || currentUrl;
  return (
    <div>
      <label className={`text-xs font-medium block mb-2 ${textSub}`}>{label}</label>
      <div className="flex items-center gap-3">
        <div
          className={`shrink-0 rounded-xl border flex items-center justify-center overflow-hidden ${
            isDark ? "border-white/10 bg-[#2C2C2E]" : "border-gray-200 bg-gray-50"
          } ${square ? "w-16 h-16" : "w-24 h-16"}`}
        >
          {src ? (
            <img src={src} alt="" className="max-w-full max-h-full object-contain" />
          ) : (
            <ImageIcon className={`w-5 h-5 ${textSub}`} />
          )}
        </div>
        <div className="flex-1 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onPick(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-60 ${
              isDark
                ? "border-white/10 text-white/80 hover:bg-white/8"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {currentUrl ? "Replace" : "Upload"}
          </button>
          {currentUrl && !uploading && (
            <button
              type="button"
              onClick={onRemove}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                isDark
                  ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
                  : "border-red-200 text-red-600 hover:bg-red-50"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>
      {hint && <p className={`text-[10px] mt-1.5 ${textSub}`}>{hint}</p>}
    </div>
  );
}

export default function BrandingPanel({ isDark, textMain, textSub, card }) {
  const { refreshPublicSettings } = useAuth();
  const [initial, setInitial] = useState(EMPTY);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { settings } = await adminApi.getDeploymentSettings();
        if (!alive) return;
        const next = pickEditable(settings);
        setInitial(next);
        setForm(next);
      } catch (err) {
        if (!alive) return;
        setError(err?.data?.error?.message || err?.message || "Failed to load branding");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => () => {
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    if (faviconPreview?.startsWith("blob:")) URL.revokeObjectURL(faviconPreview);
  }, [logoPreview, faviconPreview]);

  const changed = useMemo(() => Object.keys(diff(initial, form)).length > 0, [initial, form]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSavedMsg(false);
  };

  const handleAssetUpload = async ({
    file,
    field,
    allowed,
    maxBytes,
    setUploading,
    setPreview,
  }) => {
    if (!allowed.includes(file.type)) {
      setError(`Unsupported file type for ${field === "logo_url" ? "logo" : "favicon"}.`);
      return;
    }
    if (file.size > maxBytes) {
      setError(
        `${field === "logo_url" ? "Logo" : "Favicon"} must be ${bytesToHuman(maxBytes)} or smaller.`
      );
      return;
    }
    setError(null);
    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    try {
      const assetFolder = field === "logo_url" ? "branding/logo" : "branding/favicon";
      const { file_url } = await appClient.integrations.Core.UploadFile({ file, assetFolder });
      setField(field, file_url);
    } catch (err) {
      setError(err?.data?.error?.message || err?.message || "Upload failed");
    } finally {
      setUploading(false);
      setPreview(null);
      if (localUrl) URL.revokeObjectURL(localUrl);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const payload = diff(initial, form);
    if (Object.keys(payload).length === 0) return;

    for (const key of ["primary_color", "accent_color"]) {
      if (payload[key] && !HEX_RE.test(payload[key])) {
        setError(`${key === "primary_color" ? "Primary" : "Accent"} color must be a #RRGGBB hex value.`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const { settings } = await adminApi.updateDeploymentSettings(payload);
      const next = pickEditable(settings);
      setInitial(next);
      setForm(next);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
      await refreshPublicSettings?.();
    } catch (err) {
      setError(err?.data?.error?.message || err?.message || "Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(initial);
    setError(null);
    setSavedMsg(false);
  };

  const inputCls = `w-full text-sm rounded-xl px-3 py-2.5 outline-none transition-colors ${
    isDark
      ? "bg-[#2C2C2E] border border-white/10 text-white placeholder-white/30 focus:border-purple-500/50"
      : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400"
  }`;

  const previewAppName = form.app_name?.trim() || "Silo";
  const previewPrimary = HEX_RE.test(form.primary_color || "") ? form.primary_color : "#6366F1";
  const previewAccent = HEX_RE.test(form.accent_color || "") ? form.accent_color : "#A855F7";
  const previewLogo = logoPreview || form.logo_url;

  if (loading) {
    return (
      <div className={`rounded-2xl border p-10 flex items-center justify-center ${card}`}>
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div
          className="px-5 py-6"
          style={{
            background: `linear-gradient(135deg, ${previewAccent}, ${previewPrimary})`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/95 flex items-center justify-center overflow-hidden shadow-sm">
              {previewLogo ? (
                <img src={previewLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <Palette className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="text-white">
              <p className="text-xs uppercase tracking-wider opacity-80">Live preview</p>
              <p className="text-lg font-bold leading-tight">{previewAppName}</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <p className={`text-xs ${textSub}`}>
            Sign-in button preview using accent → primary gradient.
          </p>
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm cursor-default"
            style={{
              background: `linear-gradient(135deg, ${previewAccent}, ${previewPrimary})`,
            }}
          >
            Sign in
          </button>
        </div>
      </div>

      <div
        className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${
          isDark ? "bg-white/5 border-white/8" : "bg-gray-50 border-gray-200"
        }`}
      >
        <Info className={`w-4 h-4 mt-0.5 shrink-0 ${textSub}`} />
        <div className="flex-1">
          <p className={`text-xs ${textMain}`}>
            <span className="font-semibold">Platform attribution.</span> A small
            "Powered by Silo" badge appears on sign-in, invitation and shared
            session pages. It cannot be hidden from this panel.
          </p>
          <div className="mt-2">
            <PoweredBy variant={isDark ? "dark" : "light"} className="justify-start" />
          </div>
        </div>
      </div>

      {error && (
        <div
          className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
            isDark
              ? "bg-red-500/10 text-red-300 border border-red-500/30"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
        <div>
          <p className={`text-sm font-semibold ${textMain}`}>App identity</p>
          <p className={`text-xs ${textSub}`}>Shown in the browser tab, sign-in screen and outgoing emails.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={`text-xs font-medium block mb-1 ${textSub}`}>App name</label>
            <input
              className={inputCls}
              value={form.app_name}
              maxLength={60}
              placeholder="Silo"
              onChange={(e) => setField("app_name", e.target.value)}
            />
          </div>
          <div>
            <label className={`text-xs font-medium block mb-1 ${textSub}`}>Default locale</label>
            <select
              className={inputCls}
              value={form.default_locale}
              onChange={(e) => setField("default_locale", e.target.value)}
            >
              {LOCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`text-xs font-medium block mb-1 ${textSub}`}>Support email</label>
            <input
              className={inputCls}
              type="email"
              value={form.support_email}
              maxLength={120}
              placeholder="support@your-brand.com"
              onChange={(e) => setField("support_email", e.target.value)}
            />
          </div>
          <div>
            <label className={`text-xs font-medium block mb-1 ${textSub}`}>Email sender name</label>
            <input
              className={inputCls}
              value={form.email_from_name}
              maxLength={120}
              placeholder="Silo"
              onChange={(e) => setField("email_from_name", e.target.value)}
            />
            <p className={`text-[10px] mt-1 ${textSub}`}>
              Overridden when the EMAIL_FROM_NAME environment variable is set on the backend.
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
        <div>
          <p className={`text-sm font-semibold ${textMain}`}>Colors</p>
          <p className={`text-xs ${textSub}`}>
            Used for accent gradients (sign-in, profile cover) via the <code>--brand-primary</code> and{" "}
            <code>--brand-accent</code> CSS variables.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorField
            label="Primary color"
            value={form.primary_color}
            onChange={(v) => setField("primary_color", v)}
            isDark={isDark}
            textSub={textSub}
          />
          <ColorField
            label="Accent color"
            value={form.accent_color}
            onChange={(v) => setField("accent_color", v)}
            isDark={isDark}
            textSub={textSub}
          />
        </div>
      </div>

      <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
        <div>
          <p className={`text-sm font-semibold ${textMain}`}>Brand assets</p>
          <p className={`text-xs ${textSub}`}>SVGs are served as-is; admins should verify the source is trusted.</p>
        </div>
        <AssetUploader
          label="Logo"
          hint="PNG, SVG or WebP. Up to 2 MB. Shown on the sign-in screen and admin chrome."
          currentUrl={form.logo_url}
          previewUrl={logoPreview}
          uploading={logoUploading}
          accept={LOGO_TYPES}
          onPick={(file) =>
            handleAssetUpload({
              file,
              field: "logo_url",
              allowed: LOGO_TYPES,
              maxBytes: LOGO_MAX_BYTES,
              setUploading: setLogoUploading,
              setPreview: setLogoPreview,
            })
          }
          onRemove={() => setField("logo_url", "")}
          isDark={isDark}
          textSub={textSub}
        />
        <AssetUploader
          label="Favicon"
          hint="PNG, SVG or ICO. Up to 512 KB. Used in the browser tab."
          currentUrl={form.favicon_url}
          previewUrl={faviconPreview}
          uploading={faviconUploading}
          accept={FAVICON_TYPES}
          square
          onPick={(file) =>
            handleAssetUpload({
              file,
              field: "favicon_url",
              allowed: FAVICON_TYPES,
              maxBytes: FAVICON_MAX_BYTES,
              setUploading: setFaviconUploading,
              setPreview: setFaviconPreview,
            })
          }
          onRemove={() => setField("favicon_url", "")}
          isDark={isDark}
          textSub={textSub}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        {changed && !saving && (
          <button
            type="button"
            onClick={handleReset}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isDark
                ? "border-white/10 text-white/70 hover:bg-white/8"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !changed}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{
            background: `linear-gradient(135deg, ${previewAccent}, ${previewPrimary})`,
          }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : savedMsg ? (
            <Check className="w-4 h-4" />
          ) : null}
          {saving ? "Saving…" : savedMsg ? "Saved" : "Save branding"}
        </button>
      </div>
    </div>
  );
}
