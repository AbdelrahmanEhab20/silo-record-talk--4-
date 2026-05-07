import React from "react";
import { useTheme } from "@/lib/ThemeContext";
import { Globe, Loader2 } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "fr", label: "French (Français)" },
  { code: "es", label: "Spanish (Español)" },
  { code: "de", label: "German (Deutsch)" },
  { code: "zh", label: "Chinese (中文)" },
  { code: "ja", label: "Japanese (日本語)" },
  { code: "ko", label: "Korean (한국어)" },
  { code: "pt", label: "Portuguese (Português)" },
  { code: "ru", label: "Russian (Русский)" },
  { code: "it", label: "Italian (Italiano)" },
  { code: "nl", label: "Dutch (Nederlands)" },
  { code: "tr", label: "Turkish (Türkçe)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "id", label: "Indonesian (Bahasa)" },
  { code: "pl", label: "Polish (Polski)" },
  { code: "sv", label: "Swedish (Svenska)" },
  { code: "fa", label: "Persian (فارسی)" },
  { code: "ur", label: "Urdu (اردو)" },
  { code: "th", label: "Thai (ภาษาไทย)" },
  { code: "vi", label: "Vietnamese (Tiếng Việt)" },
  { code: "uk", label: "Ukrainian (Українська)" },
  { code: "ro", label: "Romanian (Română)" },
  { code: "cs", label: "Czech (Čeština)" },
  { code: "el", label: "Greek (Ελληνικά)" },
  { code: "hu", label: "Hungarian (Magyar)" },
  { code: "fi", label: "Finnish (Suomi)" },
  { code: "da", label: "Danish (Dansk)" },
  { code: "no", label: "Norwegian (Norsk)" },
  { code: "he", label: "Hebrew (עברית)" },
  { code: "ms", label: "Malay (Bahasa Melayu)" },
  { code: "bn", label: "Bengali (বাংলা)" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "tl", label: "Filipino (Tagalog)" },
  { code: "sw", label: "Swahili (Kiswahili)" },
];

export { LANGUAGES };

export default function LanguageSelector({ value, onChange, loading = false }) {
  const { isDark } = useTheme();

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin flex-shrink-0" />
      ) : (
        <Globe className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ maxWidth: 72 }}
        className={`text-xs font-medium bg-transparent outline-none cursor-pointer ${isDark ? 'text-white/70' : 'text-gray-600'}`}
      >
        {LANGUAGES.map((lang) => (
          <option
            key={lang.code}
            value={lang.code}
            className={isDark ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-900'}
          >
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}