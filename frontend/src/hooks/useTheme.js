import { useEffect, useState } from "react";

const KEY = "theme";

// The inline script in index.html has already set the class before first paint;
// read it back so state and DOM agree.
const initialTheme = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Remembering the choice is a convenience; ignore storage failures.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggleTheme };
}
