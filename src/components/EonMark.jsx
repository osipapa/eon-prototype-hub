import { useEffect, useId, useState } from "react";
import { safeBrandLogoUrl } from "@/lib/branding";

export default function EonMark({ src, className = "eon-brand-logo", size = 24 }) {
  const [failed, setFailed] = useState(false);
  const gradientId = `eon-accent-${useId().replaceAll(":", "")}`;
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
      <defs>
        <linearGradient id={gradientId} x1="5" y1="4" x2="19" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DD0EFF" />
          <stop offset="1" stopColor="#F19DFF" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 4 A8 8 0 0 1 12 20" stroke={`url(#${gradientId})`} strokeWidth="2" />
    </svg>
  );
}
