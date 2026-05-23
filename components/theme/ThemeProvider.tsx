"use client";

import { useEffect } from "react";

export type ThemePreference = "default" | "light" | "midnight";

export const themeStorageKey = "tripglass:theme";

export function applyTheme(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(themeStorageKey, theme);
}

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "default";
  const stored = window.localStorage.getItem(themeStorageKey);
  return stored === "light" || stored === "midnight" || stored === "default"
    ? stored
    : "default";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  return children;
}
