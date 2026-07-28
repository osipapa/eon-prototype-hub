import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import PromptLibrary from "@/features/prompts/PromptLibrary";
import { STARTER_PROMPTS } from "@/features/prompts/starterPrompts";
import { useAuth } from "@/lib/auth";
import { cacheEonLogo } from "@/lib/branding";
import {
  createPrompt, deletePrompt, listAssets, listPrompts, subscribePrompts, updatePrompt,
} from "@/lib/data";

function tableIsMissing(error) {
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || /prompts.*(does not exist|schema cache)/i.test(error?.message || "");
}

function assetMap(rows) {
  const assets = Object.fromEntries((rows || []).map((item) => [item.key, item.url]));
  cacheEonLogo(assets.eonLogo);
  return assets;
}

export default function Prompts() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [prompts, setPrompts] = useState(null);
  const [assets, setAssets] = useState({});
  const [source, setSource] = useState("shared");

  const load = useCallback(async () => {
    const assetsPromise = listAssets().catch((error) => {
      console.warn("Prompt Library branding could not be loaded.", error);
      return [];
    });

    try {
      const [promptRows, assetRows] = await Promise.all([listPrompts(), assetsPromise]);
      setPrompts(promptRows);
      setAssets(assetMap(assetRows));
      setSource("shared");
    } catch (error) {
      if (!tableIsMissing(error)) {
        console.warn("Shared prompts are temporarily unavailable; using the bundled starter library.", error);
      }
      setPrompts(STARTER_PROMPTS);
      setAssets(assetMap(await assetsPromise));
      setSource("starter");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (source !== "shared") return undefined;
    return subscribePrompts(() => {
      listPrompts()
        .then(setPrompts)
        .catch((error) => console.warn("Couldn't refresh the Prompt Library.", error));
    });
  }, [source]);

  useEffect(() => {
    if (!prompts?.length || (slug && prompts.some((prompt) => prompt.slug === slug))) return;
    navigate(`/prompts/${prompts[0].slug}`, { replace: true });
  }, [navigate, prompts, slug]);

  if (!prompts) return <LoadingScreen>Loading prompts…</LoadingScreen>;

  const handleCreatePrompt = async (patch) => {
    if (!profile?.id || !profile?.team_id) {
      throw new Error("Your team profile is still loading. Try again in a moment.");
    }
    const created = await createPrompt({
      ...patch,
      team_id: profile.team_id,
      slug: uniquePromptSlug(patch.title, prompts),
      version: 1,
      created_by: profile.id,
      updated_by: profile.id,
    });
    setPrompts((current) => [...current, created]);
    navigate(`/prompts/${created.slug}`);
    return created;
  };

  const handleUpdatePrompt = async (prompt, patch) => {
    const updated = await updatePrompt(prompt.id, {
      ...patch,
      version: (prompt.version || 1) + 1,
      updated_by: profile?.id || null,
    });
    setPrompts((current) => current.map((item) => item.id === updated.id ? updated : item));
    return updated;
  };

  const handleDeletePrompt = async (prompt) => {
    await deletePrompt(prompt.id);
    const remaining = prompts.filter((item) => item.id !== prompt.id);
    setPrompts(remaining);
    navigate(remaining.length ? `/prompts/${remaining[0].slug}` : "/prompts", { replace: true });
  };

  return (
    <PromptLibrary
      prompts={prompts}
      assets={assets}
      source={source}
      userEmail={user?.email}
      isAdmin={isAdmin}
      currentUserId={profile?.id}
      activeSlug={slug}
      onSelectPrompt={(prompt) => navigate(`/prompts/${prompt.slug}`)}
      onOpenPrototypes={() => navigate("/")}
      onOpenTracking={() => navigate("/tracking")}
      onOpenAdmin={() => navigate("/admin")}
      onSignOut={signOut}
      onCreatePrompt={source === "shared" ? handleCreatePrompt : undefined}
      onUpdatePrompt={source === "shared" ? handleUpdatePrompt : undefined}
      onDeletePrompt={source === "shared" ? handleDeletePrompt : undefined}
    />
  );
}

function uniquePromptSlug(title, prompts) {
  const base = String(title || "prompt")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "prompt";
  const used = new Set((prompts || []).map((prompt) => prompt.slug));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
