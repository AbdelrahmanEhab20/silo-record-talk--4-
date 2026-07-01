import React, { useEffect, useMemo, useRef, useState } from "react";
import { appClient } from "@/api/appClient";
import { Camera, Pencil, Check, X, Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const EMPTY_FORM = { full_name: "", bio: "", phone: "", location: "", job_title: "" };

function buildForm(user) {
  if (!user) return EMPTY_FORM;
  return {
    full_name: user.full_name || "",
    bio: user.bio || "",
    phone: user.phone || "",
    location: user.location || "",
    job_title: user.job_title || "",
  };
}

function trimToLimit(value, max) {
  if (!value) return "";
  return value.length > max ? value.slice(0, max) : value;
}

export default function UserProfileCard() {
  const { isDark } = useTheme();
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [form, setForm] = useState(() => buildForm(user));
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!editing) setForm(buildForm(user));
  }, [user, editing]);

  // Free the preview blob URL when it is no longer needed.
  useEffect(() => () => {
    if (previewPhoto?.startsWith("blob:")) URL.revokeObjectURL(previewPhoto);
  }, [previewPhoto]);

  const initials = useMemo(() => {
    const source = user?.full_name?.trim() || user?.email || "U";
    return source
      .split(/\s+/)
      .map((part) => part.trim()[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user]);

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Unsupported image type. Use JPEG, PNG, WebP, GIF or HEIC.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image is larger than 5 MB. Choose a smaller file.");
      return;
    }

    setError(null);
    setUploadingPhoto(true);

    const localPreview = URL.createObjectURL(file);
    setPreviewPhoto(localPreview);

    try {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file, assetFolder: "avatars" });
      const updated = await appClient.auth.updateMe({ profile_photo_url: file_url });
      await refreshUser(updated);
      setPreviewPhoto(null);
    } catch (err) {
      console.error("Photo upload failed:", err);
      setError(err?.data?.error?.message || err?.message || "Failed to upload photo");
      setPreviewPhoto(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const payload = {
        full_name: trimToLimit(form.full_name.trim(), 120),
        bio: trimToLimit(form.bio.trim(), 500),
        phone: trimToLimit(form.phone.trim(), 32),
        location: trimToLimit(form.location.trim(), 120),
        job_title: trimToLimit(form.job_title.trim(), 120),
      };
      const updated = await appClient.auth.updateMe(payload);
      await refreshUser(updated);
      setEditing(false);
    } catch (err) {
      console.error("Profile save failed:", err);
      setError(err?.data?.error?.message || err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(buildForm(user));
    setError(null);
    setEditing(false);
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    );
  }

  const photoSrc = previewPhoto || user.profile_photo_url || null;
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const inputCls = `w-full text-sm rounded-xl px-3 py-2.5 outline-none transition-colors ${
    isDark
      ? "bg-[#2C2C2E] border border-white/10 text-white placeholder-white/30 focus:border-purple-500/50"
      : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400"
  }`;

  const bioRemaining = 500 - form.bio.length;

  return (
    <div className={`${card} rounded-2xl overflow-hidden shadow-sm`}>
      <div
        className="h-20 w-full"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-accent, #A855F7), var(--brand-primary, #6366F1), #22D3EE)",
        }}
      />

      <div className="px-5 pb-5">
        <div className="flex items-end justify-between -mt-10 mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-[#1C1C1E] overflow-hidden bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-lg relative">
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={() => setPreviewPhoto(null)}
                />
              ) : (
                <span className="text-white text-xl font-bold">{initials}</span>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              title="Change photo"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center shadow-md hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors dark:border-white/10 dark:text-white/60 dark:hover:bg-white/8 border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="w-3 h-3" /> Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="w-8 h-8 rounded-xl flex items-center justify-center border dark:border-white/10 dark:text-white/50 border-gray-200 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-500 hover:bg-purple-600 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className={`flex items-start gap-2 rounded-xl px-3 py-2 mb-3 text-xs ${
            isDark ? "bg-red-500/10 text-red-300 border border-red-500/30" : "bg-red-50 text-red-600 border border-red-200"
          }`}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {!editing ? (
          <div>
            <h2 className="text-lg font-bold dark:text-white text-gray-900 leading-tight">{user.full_name || "—"}</h2>
            {user.job_title && <p className={`text-sm ${textSub} mt-0.5`}>{user.job_title}</p>}
            {user.bio && <p className={`text-sm mt-2 leading-relaxed ${isDark ? "text-white/70" : "text-gray-600"}`}>{user.bio}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {user.email && <span className={`text-xs ${textSub}`}>✉ {user.email}</span>}
              {user.phone && <span className={`text-xs ${textSub}`}>📞 {user.phone}</span>}
              {user.location && <span className={`text-xs ${textSub}`}>📍 {user.location}</span>}
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            <div>
              <label className={`text-xs font-medium block mb-1 ${textSub}`}>Full Name</label>
              <input
                className={inputCls}
                value={form.full_name}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1 ${textSub}`}>Job Title</label>
              <input
                className={inputCls}
                value={form.job_title}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                placeholder="e.g. Product Manager"
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className={`text-xs font-medium ${textSub}`}>Bio</label>
                <span className={`text-[10px] ${bioRemaining < 0 ? "text-red-500" : textSub}`}>
                  {bioRemaining} left
                </span>
              </div>
              <textarea
                className={`${inputCls} resize-none h-20`}
                value={form.bio}
                maxLength={500}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="A short bio about yourself"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium block mb-1 ${textSub}`}>Phone</label>
                <input
                  className={inputCls}
                  value={form.phone}
                  maxLength={32}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div>
                <label className={`text-xs font-medium block mb-1 ${textSub}`}>Location</label>
                <input
                  className={inputCls}
                  value={form.location}
                  maxLength={120}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="City, Country"
                />
              </div>
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1 ${textSub}`}>Email</label>
              <input className={`${inputCls} opacity-50 cursor-not-allowed`} value={user.email} disabled />
              <p className={`text-[10px] mt-1 ${textSub}`}>Email can't be changed. Contact an admin if you need to update it.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
