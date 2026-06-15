import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

const DEFAULTS = {
  appName: "Silo",
  faviconUrl: "/favicon.svg",
  primaryColor: "#6366F1",
  accentColor: "#A855F7",
};

function ensureFaviconLink() {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  return link;
}

/**
 * Mount once near the app root. Pushes the deployment-level branding
 * (document title, favicon, hex CSS variables) into the DOM whenever
 * `appPublicSettings` changes. We intentionally keep this separate from
 * the Tailwind `--primary` / `--accent` HSL tokens — those drive the
 * semantic palette and re-skinning them would break the design system.
 */
export default function BrandingEffect() {
  const { appPublicSettings, refreshPublicSettings } = useAuth();
  const branding = appPublicSettings?.public_settings || {};

  useEffect(() => {
    const previousTitle = document.title;
    const appName = (branding.app_name || "").trim() || DEFAULTS.appName;
    document.title = appName;
    return () => {
      document.title = previousTitle;
    };
  }, [branding.app_name]);

  useEffect(() => {
    const link = ensureFaviconLink();
    const previousHref = link.getAttribute("href");
    const next = (branding.favicon_url || "").trim() || DEFAULTS.faviconUrl;
    link.setAttribute("href", next);
    return () => {
      if (previousHref) link.setAttribute("href", previousHref);
    };
  }, [branding.favicon_url]);

  useEffect(() => {
    const root = document.documentElement;
    const primary = (branding.primary_color || "").trim() || DEFAULTS.primaryColor;
    const accent = (branding.accent_color || "").trim() || DEFAULTS.accentColor;
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-accent", accent);
  }, [branding.primary_color, branding.accent_color]);

  useEffect(() => {
    if (!refreshPublicSettings) return undefined;
    const onFocus = () => {
      refreshPublicSettings();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshPublicSettings]);

  return null;
}
