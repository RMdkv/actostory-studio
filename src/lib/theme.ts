import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "acto-theme";
const DARK_CLASS = "dark";

const listeners = new Set<() => void>();

function readTheme(): Theme {
  return document.documentElement.classList.contains(DARK_CLASS) ? "dark" : "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
  document.documentElement.classList.toggle(DARK_CLASS, theme === "dark");
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, (): Theme => "dark");
  return { theme, setTheme };
}

// Runs before first paint so the saved theme never flashes. Dark is the default for first-time visitors.
export const themeInitScript = `(function(){var d=true;try{d=localStorage.getItem("${STORAGE_KEY}")!=="light"}catch(e){}if(d)document.documentElement.classList.add("${DARK_CLASS}")})();`;
