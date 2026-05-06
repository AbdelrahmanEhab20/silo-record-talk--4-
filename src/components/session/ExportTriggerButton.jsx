import React from "react";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";

export default function ExportTriggerButton({ sessionId }) {
  const navigate = useNavigate();

  const handleExport = () => {
    navigate(`/ExportStudio?sessionId=${sessionId}`);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
    >
      <Download className="w-4 h-4" />
      Export
    </button>
  );
}