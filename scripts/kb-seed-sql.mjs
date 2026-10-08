// Prints SQL that seeds every team's knowledge base from src/features/design/kbSeed.js.
// Existing rows are left alone, so it is safe to re-run.
//   node scripts/kb-seed-sql.mjs >> supabase/migrations/<file>.sql
import { KB_SEED } from "../src/features/design/kbSeed.js";

const quote = (text) => {
  if (text.includes("$kb$")) throw new Error("Seed text cannot contain $kb$");
  return `$kb$${text}$kb$`;
};
const array = (items) => `array[${items.map(quote).join(", ")}]::text[]`;

const rows = KB_SEED.map((e) =>
  `  (${quote(e.slug)}, ${quote(e.type)}, ${quote(e.title)}, ${quote(e.summary)}, ${quote(e.group_path)}, ${quote(e.status)}, ${quote(e.body_md)}, ${array(e.refs)}, ${e.sort_order})`);

console.log(`insert into public.kb_entries (team_id, slug, type, title, summary, group_path, status, body_md, refs, sort_order)
select teams.id, seed.slug, seed.type, seed.title, seed.summary, seed.group_path, seed.status, seed.body_md, seed.refs, seed.sort_order
from public.teams
cross join (values
${rows.join(",\n")}
) as seed (slug, type, title, summary, group_path, status, body_md, refs, sort_order)
on conflict (team_id, slug) do nothing;`);
