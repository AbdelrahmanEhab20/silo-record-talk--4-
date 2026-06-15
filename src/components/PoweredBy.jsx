import React from "react";

/**
 * Platform attribution badge. Always renders "Powered by Silo" regardless of
 * the deployment's branding settings — this is the immutable credit to the
 * underlying product when the app is white-labelled for another organization.
 *
 * Props:
 *  - variant: "auto" | "dark" | "light" — controls foreground contrast.
 *  - className: extra wrapper classes (e.g. margin / alignment).
 */
export default function PoweredBy({ variant = "auto", className = "" }) {
  const colorCls =
    variant === "dark"
      ? "text-white/40 hover:text-white/70"
      : variant === "light"
        ? "text-gray-400 hover:text-gray-600"
        : "text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/70";

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <a
        href="https://siloainotes.com"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide transition-colors ${colorCls}`}
        title="Powered by Silo"
      >
        <span className="opacity-80">Powered by</span>
        <span
          className="font-bold text-transparent bg-clip-text"
          style={{
            backgroundImage: "linear-gradient(135deg, #A855F7, #6366F1)",
          }}
        >
          Silo
        </span>
      </a>
    </div>
  );
}
