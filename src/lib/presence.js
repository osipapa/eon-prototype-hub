import { supabase } from "./supabase";

/* Live presence shows which signed-in users are viewing each project. -------
   One realtime presence channel per team. Each client tracks its identity plus
   the prototype it's currently looking at; switching prototypes re-tracks. The
   caller gets a flat list of everyone present (self included) on every sync and
   decides how to render it (e.g. avatars of co-viewers on the active prototype).

   joinTeamPresence(teamId, me, onSync) -> { setProject(projectId), leave() }
     me:     { id, name, email }
     onSync: (viewers) => void, where viewers is
             [{ id, name, email, project_id, online_at }]
*/
export function joinTeamPresence(teamId, me, onSync) {
  if (!teamId || !me?.id) return { setProject() {}, leave() {} };

  let projectId = null;
  const channel = supabase.channel(`presence:team:${teamId}`, {
    config: { presence: { key: me.id } },
  });

  const track = () => channel.track({
    id: me.id,
    name: me.name || me.email || "Teammate",
    email: me.email || null,
    project_id: projectId,
    online_at: new Date().toISOString(),
  });

  const emit = () => {
    const state = channel.presenceState();
    // Supabase keys presence by our chosen key and stores an array of metas per
    // key, one per open tab. Keep the most recent tab for each person.
    const viewers = Object.values(state)
      .map((metas) => metas[metas.length - 1])
      .filter(Boolean);
    onSync(viewers);
  };

  channel
    .on("presence", { event: "sync" }, emit)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") track();
    });

  return {
    setProject(nextProjectId) {
      if (nextProjectId === projectId) return;
      projectId = nextProjectId || null;
      track();
    },
    leave() {
      supabase.removeChannel(channel);
    },
  };
}
