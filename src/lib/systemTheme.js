import { useEffect, useState } from "react";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

function readSystemTheme() {
  return window.matchMedia?.(SYSTEM_DARK_QUERY).matches ? "dark" : "light";
}

export function useSystemTheme() {
  const [theme, setTheme] = useState(readSystemTheme);

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    const update = () => setTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return theme;
}
