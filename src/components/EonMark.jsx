import { useEffect, useState } from "react";
import { safeBrandLogoUrl } from "@/lib/branding";

export default function EonMark({ src, className = "eon-brand-logo", size = 24 }) {
  const [failed, setFailed] = useState(false);
  const safeSrc = safeBrandLogoUrl(src);

  useEffect(() => setFailed(false), [safeSrc]);

  if (safeSrc && !failed) {
    return (
      <img
        className={className}
        src={safeSrc}
        width={size}
        height={size}
        alt="Eon"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Eon"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 4 A8 8 0 0 1 12 20" stroke="#EDD2F6" strokeWidth="2" />
    </svg>
  );
}
