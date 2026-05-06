import React, { useState, useRef } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown, Image, FileText, Loader2, X, BookOpen, Upload
} from "lucide-react";

/**
 * SessionContextPanel
 * Collapsible panel shown on the Recording start screen.
 * Collects: video URL, images (multi), pasted text, agenda (text + file upload).
 * Calls onChange(contextData) whenever data changes.
 */
export default function SessionContextPanel({ onChange }) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);

  const [contextText, setContextText] = useState("");
  const [agendaText, setAgendaText] = useState("");

  const [images, setImages] = useState([]); // { name, url, preview }
  const [agendaFiles, setAgendaFiles] = useState([]); // { name, url }

  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingAgenda, setUploadingAgenda] = useState(false);

  const imageInputRef = useRef(null);
  const agendaInputRef = useRef(null);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const inputClass = isDark
    ? "bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500/60 focus:outline-none"
    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:outline-none";

  const notify = (patch) => {
    onChange({
      general_context_text: contextText,
      agenda_text: agendaText,
      image_urls: images.map((i) => i.url),
      agenda_file_urls: agendaFiles.map((f) => f.url),
      ...patch,
    });
  };

  const handleContextTextChange = (val) => {
    setContextText(val);
    notify({ general_context_text: val });
  };

  const handleAgendaTextChange = (val) => {
    setAgendaText(val);
    notify({ agenda_text: val });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImages(true);
    const uploaded = [];
    for (const file of files) {
      const preview = URL.createObjectURL(file);
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      uploaded.push({ name: file.name, url: file_url, preview });
    }
    const next = [...images, ...uploaded];
    setImages(next);
    notify({ image_urls: next.map((i) => i.url) });
    setUploadingImages(false);
    e.target.value = "";
  };

  const removeImage = (idx) => {
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    notify({ image_urls: next.map((i) => i.url) });
  };

  const handleAgendaFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingAgenda(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      uploaded.push({ name: file.name, url: file_url });
    }
    const next = [...agendaFiles, ...uploaded];
    setAgendaFiles(next);
    notify({ agenda_file_urls: next.map((f) => f.url) });
    setUploadingAgenda(false);
    e.target.value = "";
  };

  const removeAgendaFile = (idx) => {
    const next = agendaFiles.filter((_, i) => i !== idx);
    setAgendaFiles(next);
    notify({ agenda_file_urls: next.map((f) => f.url) });
  };

  const hasData = contextText || images.length > 0 || agendaText || agendaFiles.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors ${card} ${open ? "" : isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}>
        <div className="flex items-center gap-2">
          <BookOpen className={`w-4 h-4 ${hasData ? "text-purple-400" : textSub}`} />
          <span className={`text-sm font-semibold ${hasData ? (isDark ? "text-white/80" : "text-gray-700") : textSub}`}>
            Session Context
          </span>
          {hasData && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
              Added
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""} ${textSub}`} />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className={`mt-2 rounded-2xl border ${card} p-4 space-y-4`}>

          {/* Images */}
          <div>
            <label className={`text-xs font-semibold flex items-center gap-1.5 mb-2 ${textSub}`}>
              <Image className="w-3.5 h-3.5" /> Photos
            </label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden group">
                    <img src={img.preview || img.url} alt={img.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImages}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors ${isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70" : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500"}`}
            >
              {uploadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingImages ? "Uploading…" : "Upload photos from library / camera"}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Background Context Text */}
          <div>
            <label className={`text-xs font-semibold flex items-center gap-1.5 mb-2 ${textSub}`}>
              <FileText className="w-3.5 h-3.5" /> Background Info
            </label>
            <textarea
              placeholder="Add background info to help AI understand the session better…"
              value={contextText}
              onChange={(e) => handleContextTextChange(e.target.value)}
              rows={3}
              className={`w-full rounded-xl px-3 py-2.5 text-sm resize-none ${inputClass}`}
            />
          </div>

          {/* Agenda — nested collapsible */}
          <Collapsible open={agendaOpen} onOpenChange={setAgendaOpen}>
            <CollapsibleTrigger className={`w-full flex items-center justify-between py-2 transition-colors`}>
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${agendaText || agendaFiles.length > 0 ? "text-purple-400" : textSub}`}>
                <BookOpen className="w-3.5 h-3.5" /> Agenda
                {(agendaText || agendaFiles.length > 0) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">Added</span>
                )}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${agendaOpen ? "rotate-180" : ""} ${textSub}`} />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="pt-2 space-y-3">
                {/* Agenda text */}
                <textarea
                  placeholder="Type or paste your agenda here…"
                  value={agendaText}
                  onChange={(e) => handleAgendaTextChange(e.target.value)}
                  rows={4}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm resize-none ${inputClass}`}
                />

                {/* Agenda files */}
                {agendaFiles.length > 0 && (
                  <div className="space-y-1">
                    {agendaFiles.map((f, idx) => (
                      <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${isDark ? "bg-white/5 text-white/60" : "bg-gray-50 text-gray-600"}`}>
                        <span className="truncate flex-1">{f.name}</span>
                        <button onClick={() => removeAgendaFile(idx)} className="ml-2 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => agendaInputRef.current?.click()}
                  disabled={uploadingAgenda}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors ${isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70" : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500"}`}
                >
                  {uploadingAgenda ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingAgenda ? "Uploading…" : "Upload agenda (PDF, Word)"}
                </button>
                <input
                  ref={agendaInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  className="hidden"
                  onChange={handleAgendaFileUpload}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}