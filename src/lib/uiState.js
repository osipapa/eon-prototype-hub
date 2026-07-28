import { useEffect, useState } from "react";

export function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try { return window.localStorage.getItem(key) || initialValue; }
    catch { return initialValue; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(key, value); }
    catch { /* Storage can be unavailable in hardened browsers. */ }
  }, [key, value]);

  return [value, setValue];
}

export async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    // Fall back for embedded or permission-restricted browsers.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}
