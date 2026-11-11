// Media library rules for the hub MCP, matching the hub's own uploads
// (src/lib/data.js) and media tokens (src/features/hub/prototypes.js).
// Pure helpers: no I/O.
import { lineAt } from "./lib.ts";

// Same keys the hub accepts for saved media, used as {{key}} in prototypes.
export const MEDIA_KEY = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

// Built-in {{tokens}} the hub resolves without a saved asset (PRESET_MEDIA).
export const PRESET_MEDIA_KEYS = [
  "heroImage", "bannerImage", "cardImage", "portraitImage",
  "squareImage", "thumbnailImage", "avatarImage", "productImage",
];

export const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif",
  "image/webp": "webp", "image/svg+xml": "svg", "image/avif": "avif",
};
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const extensionFor = (type: string) => IMAGE_TYPES[type] ?? VIDEO_TYPES[type];
export const isVideoUrl = (value: string) => /\.(?:mp4|m4v|webm|mov)(?:[?#]|$)/i.test(value);

// Why bytes of this type can't go in the media library, or "" when they can.
export function mediaProblem(type: string, size: number): string {
  if (VIDEO_TYPES[type]) return size > MAX_VIDEO_BYTES ? "Videos need to be under 50 MB." : "";
  if (!IMAGE_TYPES[type]) return `${type || "That file"} isn't supported. Use PNG, JPG, GIF, WebP, SVG, AVIF, MP4, WebM, or MOV.`;
  return size > MAX_IMAGE_BYTES ? "Images need to be under 10 MB." : "";
}

// The media type from the first bytes, for uploads that don't say.
export function sniffType(bytes: Uint8Array): string | null {
  const at = (offset: number, ...values: number[]) => values.every((value, i) => bytes[offset + i] === value);
  const ascii = (offset: number, text: string) => at(offset, ...[...text].map((ch) => ch.charCodeAt(0)));
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (ascii(0, "GIF8")) return "image/gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(4, "ftypavif") || ascii(4, "ftypavis")) return "image/avif";
  if (ascii(4, "ftypqt")) return "video/quicktime";
  if (ascii(4, "ftyp") && /^(?:isom|iso[2-6]|mp4[12]|avc1|M4V |dash|mmp4)$/.test(String.fromCharCode(...bytes.subarray(8, 12)))) return "video/mp4";
  if (at(0, 0x1a, 0x45, 0xdf, 0xa3)) return "video/webm";
  const head = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart();
  if (/^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)?<svg[\s>]/i.test(head)) return "image/svg+xml";
  return null;
}

export function decodeBase64(text: string): Uint8Array {
  const binary = atob(text.replace(/\s+/g, ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export type InlineMedia = { uri: string; type: string; bytes: number; copies: number; line: number };

// Base64 data: URIs for images and videos in the HTML, identical ones counted
// together, largest first. Base64 wrapped across lines is skipped, because
// replacing only its first line would break the file.
export function inlineMedia(html: string): InlineMedia[] {
  const found = new Map<string, InlineMedia>();
  for (const match of html.matchAll(/data:((?:image|video)\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})/gi)) {
    const uri = match[0];
    const known = found.get(uri);
    if (known) { known.copies += 1; continue; }
    const end = match.index! + uri.length;
    if (/^\s+[A-Za-z0-9+/]{8}/.test(html.slice(end, end + 40))) continue;
    const data = match[2];
    const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
    found.set(uri, {
      uri, type: match[1].toLowerCase(), bytes: Math.floor((data.length * 3) / 4) - padding,
      copies: 1, line: lineAt(html, match.index!),
    });
  }
  return [...found.values()].sort((a, b) => b.bytes - a.bytes);
}

export const kb = (size: number) => size < 1024 ? `${size} B` : `${Math.round(size / 1024).toLocaleString("en-US")} KB`;
