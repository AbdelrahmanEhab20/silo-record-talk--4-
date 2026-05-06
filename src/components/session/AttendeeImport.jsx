import React, { useState, useRef } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Loader2, X, FileText, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ATTENDEE_SCHEMA = {
  type: "object",
  properties: {
    attendees: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          email: { type: "string" },
        },
      },
    },
  },
};

export default function AttendeeImport({ onAdd }) {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualName, setManualName] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const fileInputRef = useRef(null);

  const handleAddManual = () => {
    if (!manualName.trim()) {
      setError("Name is required");
      return;
    }
    const newAttendee = {
      name: manualName.trim(),
      role: manualRole.trim() || "Attendee",
      email: manualEmail.trim() || undefined,
    };
    onAdd(newAttendee);
    setManualName("");
    setManualRole("");
    setManualEmail("");
    setError(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      let attendees = [];

      if (
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.type === "image/webp"
      ) {
        // Extract from image using LLM
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract all attendee information from this image (business card, meeting photo, whiteboard, document, etc.). Look for names, titles/roles, emails, and company names.

Return ONLY a JSON array of attendee objects with this structure:
[
  { "name": "Full Name", "role": "Job Title or Role", "email": "email@example.com" }
]

If no attendee info found, return an empty array [].`,
          file_urls: [file_url],
          response_json_schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                role: { type: "string" },
                email: { type: "string" },
              },
            },
          },
        });
        attendees = result || [];
      } else {
        // Extract from document (CSV, Excel, Word, PDF)
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: ATTENDEE_SCHEMA,
        });

        if (result.status === "success" && result.output?.attendees) {
          attendees = result.output.attendees;
        } else if (result.status === "error") {
          // Fallback: try with LLM for unstructured documents
          const fallback = await base44.integrations.Core.InvokeLLM({
            prompt: `Extract all attendee information from this document. Look for names, titles/roles, emails, and departments.

Return ONLY a JSON array with this structure:
[
  { "name": "Full Name", "role": "Job Title", "email": "email@example.com" }
]

If no attendees found, return an empty array [].`,
            file_urls: [file_url],
            response_json_schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                  email: { type: "string" },
                },
              },
            },
          });
          attendees = fallback || [];
        }
      }

      if (attendees.length > 0) {
        attendees.forEach((att) => onAdd(att));
        setIsOpen(false);
      } else {
        setError("No attendees found in the file. Try a different file or add manually.");
      }
    } catch (err) {
      setError(err.message || "Failed to process file");
    } finally {
      setLoading(false);
      fileInputRef.current && (fileInputRef.current.value = "");
    }
  };

  const bg = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/10" : "border-gray-200";
  const inputCls = `w-full text-sm px-3 py-2 rounded-lg border outline-none transition-colors ${
    isDark
      ? "bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-purple-500/50"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-400"
  }`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs font-semibold gap-1.5 h-auto py-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Attendee
        </Button>
      </DialogTrigger>
      <DialogContent className={`${bg} ${border} border max-w-md`}>
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>
            Add Attendee
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className={`p-3 rounded-lg text-sm ${
            isDark
              ? "bg-red-500/10 text-red-300 border border-red-500/20"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}>
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Manual Entry Section */}
          <div className="space-y-3">
            <h4 className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? "text-white/40" : "text-gray-400"
            }`}>
              Manual Entry
            </h4>
            <input
              type="text"
              placeholder="Name *"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className={inputCls}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleAddManual()}
            />
            <input
              type="text"
              placeholder="Role (e.g., Manager)"
              value={manualRole}
              onChange={(e) => setManualRole(e.target.value)}
              className={inputCls}
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              className={inputCls}
            />
            <Button
              onClick={handleAddManual}
              disabled={loading || !manualName.trim()}
              className="w-full text-sm py-2 h-auto"
              style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Attendee
            </Button>
          </div>

          {/* File Import Section */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h4 className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? "text-white/40" : "text-gray-400"
            }`}>
              Import from File
            </h4>
            <div className={`p-4 rounded-lg border-2 border-dashed transition-colors ${
              isDark
                ? "border-white/10 bg-white/5 hover:border-purple-500/30 hover:bg-purple-500/5"
                : "border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50"
            } cursor-pointer text-center`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".xlsx,.xls,.doc,.docx,.pdf,.csv,.jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                disabled={loading}
              />
              <div className={`text-3xl mb-2 ${loading ? "opacity-50" : ""}`}>
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  <>📄</>
                )}
              </div>
              <p className={`text-sm font-medium mb-1 ${
                isDark ? "text-white/80" : "text-gray-700"
              }`}>
                {loading ? "Extracting attendees..." : "Drop file here or click to browse"}
              </p>
              <p className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
                Excel • Word • PDF • CSV • JPG • PNG
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}