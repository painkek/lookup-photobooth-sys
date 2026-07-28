import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Dark/Light theme toggle — CSS-variable edition.
 * Flips the .dark class on <html>; plain CSS in index.css does the rest.
 * No Tailwind darkMode config required.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="p-2.5 rounded-xl border transition-all bg-[var(--chip-bg)] border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--chip-bg-hover)]"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
