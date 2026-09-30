// Everyone gets their own icon: an initial on a hue picked from their email,
// so two people who share a letter still look different. The hue is the only
// input; each theme sets its own tint and ink in index.css.
const HUES = [300, 262, 217, 190, 158, 88, 42, 18, 340];

function hueFor(seed) {
  let hash = 0x811c9dc5;
  for (const char of String(seed || "")) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return HUES[(hash >>> 0) % HUES.length];
}

export function profileInitial(name, email) {
  const source = (name || email || "").trim();
  return (source.match(/[\p{L}\p{N}]/u)?.[0] || "?").toUpperCase();
}

export default function ProfileIcon({ email, name, size = 28, className = "", style }) {
  return (
    <span
      className={`eon-profile-icon${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      style={{ "--profile-hue": hueFor(email || name), width: size, height: size, fontSize: Math.round(size * 0.42), ...style }}
    >
      {profileInitial(name, email)}
    </span>
  );
}
