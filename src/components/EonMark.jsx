import { useState } from "react";
import { safeBrandLogoUrl } from "@/lib/branding";

export default function EonMark({ src, className = "eon-brand-logo", size = 24, loading = false }) {
  const [failedSrc, setFailedSrc] = useState("");
  const [loadedSrc, setLoadedSrc] = useState("");
  const safeSrc = safeBrandLogoUrl(src);
  const failed = Boolean(safeSrc) && failedSrc === safeSrc;
  const loaded = Boolean(safeSrc) && loadedSrc === safeSrc;

  if (safeSrc && !failed) {
    return (
      <span
        className={`${className} eon-brand-slot${loaded ? " is-loaded" : ""}`}
        style={{ width: size, height: size }}
        aria-busy={!loaded || undefined}
      >
        <span className="eon-brand-skeleton eon-skeleton" aria-hidden="true" />
        <img
          className="eon-brand-image"
          src={safeSrc}
          width={size}
          height={size}
          alt="Eon"
          onLoad={() => setLoadedSrc(safeSrc)}
          onError={() => setFailedSrc(safeSrc)}
        />
      </span>
    );
  }

  if (!loading) return null;

  return (
    <span
      className={`${className} eon-brand-slot is-loading`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="eon-brand-skeleton eon-skeleton" aria-hidden="true" />
    </span>
  );
}
