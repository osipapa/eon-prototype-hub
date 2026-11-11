import { assertEquals } from "jsr:@std/assert@1";
import { inlineMedia, mediaProblem, sniffType } from "./media.ts";

Deno.test("inlineMedia groups identical data URIs, largest first, with lines", () => {
  const small = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  const large = `data:image/png;base64,${"A".repeat(400)}`;
  const html = `<img src="${small}">\n<img src="${large}">\n<i style="background:url(${large})"></i>`;
  const found = inlineMedia(html);
  assertEquals(found.map((item) => [item.type, item.bytes, item.copies, item.line]), [["image/png", 300, 2, 2], ["image/gif", 14, 1, 1]]);
});

Deno.test("inlineMedia skips base64 wrapped across lines", () => {
  const html = `<img src="data:image/png;base64,${"A".repeat(76)}\n${"B".repeat(76)}">`;
  assertEquals(inlineMedia(html), []);
});

Deno.test("sniffType recognizes the media library's types", () => {
  const bytes = (...values: (number | string)[]) =>
    new Uint8Array(values.flatMap((v) => typeof v === "string" ? [...v].map((ch) => ch.charCodeAt(0)) : [v]));
  assertEquals(sniffType(bytes(0x89, "PNG", 0x0d, 0x0a)), "image/png");
  assertEquals(sniffType(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assertEquals(sniffType(bytes("GIF89a")), "image/gif");
  assertEquals(sniffType(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 ")), "image/webp");
  assertEquals(sniffType(bytes(0, 0, 0, 0x20, "ftypavif")), "image/avif");
  assertEquals(sniffType(bytes(0, 0, 0, 0x20, "ftypisom")), "video/mp4");
  assertEquals(sniffType(bytes(0, 0, 0, 0x20, "ftypqt  ")), "video/quicktime");
  assertEquals(sniffType(bytes(0, 0, 0, 0x20, "ftypheic")), null);
  assertEquals(sniffType(bytes(0x1a, 0x45, 0xdf, 0xa3)), "video/webm");
  assertEquals(sniffType(bytes('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>')), "image/svg+xml");
  assertEquals(sniffType(bytes("hello")), null);
});

Deno.test("mediaProblem enforces the library's types and limits", () => {
  assertEquals(mediaProblem("image/png", 1024), "");
  assertEquals(mediaProblem("image/png", 11 * 1024 * 1024), "Images need to be under 10 MB.");
  assertEquals(mediaProblem("video/mp4", 40 * 1024 * 1024), "");
  assertEquals(mediaProblem("application/pdf", 10).startsWith("application/pdf isn't supported"), true);
});
