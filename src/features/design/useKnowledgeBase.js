import { useCallback, useEffect, useState } from "react";
import { createKbEntry, deleteKbEntry, listKbEntries, seedKbEntries, subscribeKb, updateKbEntry } from "@/lib/data";
import { KB_SEED } from "./kbSeed";

const EDITABLE = ["slug", "type", "title", "summary", "group_path", "status", "body_md", "refs", "sort_order"];
const pick = (entry) => Object.fromEntries(EDITABLE.map((key) => [key, entry[key]]));

export class KbConflict extends Error {
  constructor() { super("Someone saved this page while you were editing. Copy your changes, reload the page, and apply them again."); }
}

/* The team's Eon Design pages, live. Until the kb_entries table answers (or if
   it is empty) the bundled seed shows instead, read-only until first save. */
export function useKnowledgeBase({ teamId, userId } = {}) {
  const [state, setState] = useState({ entries: KB_SEED, source: "loading" });

  const load = useCallback(() => {
    listKbEntries()
      .then((rows) => setState(rows?.length ? { entries: rows, source: "db" } : { entries: KB_SEED, source: "seed" }))
      .catch((error) => {
        console.warn("Knowledge base could not be loaded; showing the bundled pages.", error);
        setState({ entries: KB_SEED, source: "seed" });
      });
  }, []);

  useEffect(() => {
    load();
    return subscribeKb(load);
  }, [load]);

  const save = useCallback(async (draft, original) => {
    const patch = pick(draft);
    if (original?.id) {
      const row = await updateKbEntry(original.id, patch, original.version);
      if (!row) throw new KbConflict();
      load();
      return row;
    }
    if (!teamId) throw new Error("Your profile has no team yet, so the page cannot be saved.");
    // First save on a team with no pages: store the bundled pages too, so they
    // do not vanish once the table has a row.
    if (state.source === "seed") {
      await seedKbEntries(KB_SEED.filter((entry) => entry.slug !== draft.slug).map((entry) => ({ ...pick(entry), team_id: teamId })));
    }
    const row = await createKbEntry({ ...patch, team_id: teamId, created_by: userId ?? null });
    load();
    return row;
  }, [teamId, userId, load, state.source]);

  const remove = useCallback(async (entry) => {
    await deleteKbEntry(entry.id);
    load();
  }, [load]);

  return { ...state, save, remove };
}
