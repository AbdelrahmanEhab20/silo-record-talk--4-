import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  appearance: "system",
  setAppearance: () => {},
  isDark: false,
});

export function ThemeProvider({ children }) {
  const [appearance, setAppearanceState] = useState(
    () => localStorage.getItem("silo-appearance") || "system"
  );
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isDark =
    appearance === "dark" || (appearance === "system" && systemDark);

  // Apply dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  const setAppearance = (value) => {
    localStorage.setItem("silo-appearance", value);
    setAppearanceState(value);
  };

  return (
    <ThemeContext.Provider value={{ appearance, setAppearance, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}