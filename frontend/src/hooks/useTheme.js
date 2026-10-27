import { useEffect, useState } from "react";

const KEY = "theme";
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

// "light" | "dark" | "system". Nothing saved means follow the OS, which is
// also what the inline script in index.html assumes before first paint.
const initialPreference = () => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Fall through to the OS setting.
  }
  return "system";
};

export function useTheme() {
  const [preference, setPreference] = useState(initialPreference);
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches);
  const theme = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    const query = darkQuery();
    const onChange = (e) => setSystemDark(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    try {
      if (preference === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, preference);
    } catch {
      // Remembering the choice is a convenience; ignore storage failures.
    }
  }, [preference]);

  const toggleTheme = () => setPreference(theme === "dark" ? "light" : "dark");
  return { theme, preference, setPreference, toggleTheme };
}
