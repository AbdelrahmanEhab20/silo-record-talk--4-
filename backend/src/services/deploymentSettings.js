import { DeploymentSettings } from "../models/index.js";

const DEFAULTS = {
  singleton_key: "default",
  app_name: "Silo",
  logo_url: "",
  favicon_url: "",
  primary_color: "#6366F1",
  accent_color: "#A855F7",
  support_email: "",
  default_locale: "en",
  email_from_name: "Silo",
};

export async function getDeploymentSettings() {
  const doc = await DeploymentSettings.findOne({ singleton_key: "default" }).lean();
  if (!doc) return { ...DEFAULTS };
  return { ...DEFAULTS, ...doc };
}

export async function getPublicSettings() {
  const s = await getDeploymentSettings();
  return {
    app_name: s.app_name,
    logo_url: s.logo_url,
    favicon_url: s.favicon_url,
    primary_color: s.primary_color,
    accent_color: s.accent_color,
    support_email: s.support_email,
    default_locale: s.default_locale,
  };
}

export async function ensureDeploymentSettings() {
  return DeploymentSettings.findOneAndUpdate(
    { singleton_key: "default" },
    { $setOnInsert: DEFAULTS },
    { upsert: true, returnDocument: "after" }
  );
}
