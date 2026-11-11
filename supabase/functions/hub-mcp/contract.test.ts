// The connector keeps its own copies of the hub's media presets and viewports
// (it can't import src/). They must match src/features/hub/prototypes.js, read
// as text because that file needs Vite's import.meta.env to load.
import { assertEquals } from "jsr:@std/assert@1";
import { VIEWPORT_KEYS } from "./check.ts";
import { PRESET_MEDIA_KEYS } from "./media.ts";

const source = await Deno.readTextFile(new URL("../../../src/features/hub/prototypes.js", import.meta.url));
const keysOf = (name: string) => {
  const block = source.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\n\\};`))?.[1] ?? "";
  return [...block.matchAll(/^\s+(\w+):/gm)].map((match) => match[1]).sort();
};

Deno.test("media presets match the hub's PRESET_MEDIA", () => {
  assertEquals([...PRESET_MEDIA_KEYS].sort(), keysOf("PRESET_MEDIA"));
});

Deno.test("viewports match the hub's VIEWPORTS", () => {
  assertEquals([...VIEWPORT_KEYS].sort(), keysOf("VIEWPORTS"));
});
