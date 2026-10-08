import { assertEquals } from "jsr:@std/assert@1";
import { crc32, zipFiles } from "./zip.js";

Deno.test("crc32 matches the reference value", () => {
  assertEquals(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

Deno.test("zipFiles writes a readable archive", async () => {
  const blob = zipFiles([{ path: "index.md", text: "# Hi\n" }, { path: "spacing.md", text: "ü" }]);
  const dir = await Deno.makeTempDir();
  const file = `${dir}/bundle.zip`;
  await Deno.writeFile(file, new Uint8Array(await blob.arrayBuffer()));
  const out = await new Deno.Command("unzip", { args: ["-p", file, "spacing.md"] }).output();
  assertEquals(new TextDecoder().decode(out.stdout), "ü");
  const list = await new Deno.Command("unzip", { args: ["-Z1", file] }).output();
  assertEquals(new TextDecoder().decode(list.stdout).trim().split("\n"), ["index.md", "spacing.md"]);
});
