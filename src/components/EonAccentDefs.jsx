export default function EonAccentDefs() {
  return (
    <svg className="eon-accent-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="eon-icon-gradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--eon-accent-start)" />
          <stop offset="1" stopColor="var(--eon-accent-end)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
