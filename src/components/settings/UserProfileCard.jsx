import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Pencil, Check, X, Loader2, User } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function UserProfileCard() {
  const { isDark } = useTheme();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({ full_name: "", bio: "", phone: "", location: "", job_title: "" });
  const fileInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setForm({
        full_name: u.full_name || "",
        bio: u.bio || "",
        phone: u.phone || "",
        location: u.location || "",
        job_title: u.job_title || "",
      });
    }).catch(() => {});
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_photo_url: file_url });
      const updated = await base44.auth.me();
      setUser(updated);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(form);
      const updated = await base44.auth.me();
      setUser(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      full_name: user?.full_name || "",
      bio: user?.bio || "",
      phone: user?.phone || "",
      location: user?.location || "",
      job_title: user?.job_title || "",
    });
    setEditing(false);
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    );
  }

  const initials = (user.full_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const inputCls = `w-full text-sm rounded-xl px-3 py-2.5 outline-none transition-colors ${isDark ? "bg-[#2C2C2E] border border-white/10 text-white placeholder-white/30 focus:border-purple-500/50" : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400"}`;

  return (
    <div className={`${card} rounded-2xl overflow-hidden shadow-sm`}>
      {/* Cover gradient */}
      <div className="h-20 w-full" style={{ background: "linear-gradient(135deg, #A855F7, #6366F1, #22D3EE)" }} />

      <div className="px-5 pb-5">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-10 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-[#1C1C1E] overflow-hidden bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-lg">
              {user.profile_photo_url ? (
                <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
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
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center shadow-md hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Edit / Save buttons */}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors dark:border-white/10 dark:text-white/60 dark:hover:bg-white/8 border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="w-3 h-3" /> Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleCancel} className="w-8 h-8 rounded-xl flex items-center justify-center border dark:border-white/10 dark:text-white/50 border-gray-200 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-500 hover:bg-purple-600 transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          )}
        </div>

        {/* Name & role */}
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
              <input className={inputCls} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your name" />
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1 ${textSub}`}>Job Title</label>
              <input className={inputCls} value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder="e.g. Product Manager" />
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1 ${textSub}`}>Bio</label>
              <textarea className={`${inputCls} resize-none h-20`} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="A short bio about yourself" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium block mb-1 ${textSub}`}>Phone</label>
                <input className={inputCls} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 890" />
              </div>
              <div>
                <label className={`text-xs font-medium block mb-1 ${textSub}`}>Location</label>
                <input className={inputCls} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, Country" />
              </div>
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1 ${textSub}`}>Email</label>
              <input className={`${inputCls} opacity-50 cursor-not-allowed`} value={user.email} disabled />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}