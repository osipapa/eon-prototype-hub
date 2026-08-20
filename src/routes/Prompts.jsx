import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import PromptLibrary from "@/features/prompts/PromptLibrary";
import { PROMPT_CATEGORIES, STARTER_PROMPTS } from "@/features/prompts/starterPrompts";
import { useAuth } from "@/lib/auth";
import { cacheEonLogo } from "@/lib/branding";
import {
  createPrompt, createPromptCategory, deletePrompt, deletePromptCategory, listAssets,
  listPromptCategories, listPrompts, subscribePromptCategories, subscribePrompts, updatePrompt,
} from "@/lib/data";

function tableIsMissing(error) {
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || /prompts.*(does not exist|schema cache)/i.test(error?.message || "");
}

function categoryTableIsMissing(error) {
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || /prompt_categories.*(does not exist|schema cache)/i.test(error?.message || "");
}

function assetMap(rows) {
  const assets = Object.fromEntries((rows || []).map((item) => [item.key, item.url]));
  cacheEonLogo(assets.eonLogo);
  return assets;
}

function sortPromptRows(rows, categories = []) {
  const order = new Map(categories.map((category, index) => [category.name, index]));
  return [...(rows || [])].sort((left, right) => {
    const categoryDelta = (order.get(left.category) ?? Number.MAX_SAFE_INTEGER)
      - (order.get(right.category) ?? Number.MAX_SAFE_INTEGER);
    return categoryDelta || left.title.localeCompare(right.title);
  });
}

function normalizedCategories(rows, prompts = []) {
  const configured = rows === null ? ["General", ...PROMPT_CATEGORIES] : [];
  const knownNames = new Set();
  const combined = [];

  [...(rows || [])]
    .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name))
    .forEach((category) => {
      const key = category.name.trim().toLowerCase();
      if (!key || knownNames.has(key)) return;
      knownNames.add(key);
      combined.push(category);
    });

  [...configured, ...(prompts || []).map((prompt) => prompt.category || "General")]
    .forEach((name, index) => {
      const key = name.trim().toLowerCase();
      if (!key || knownNames.has(key)) return;
      knownNames.add(key);
      combined.push({ id: null, name, sort_order: 1000 + index, created_by: null });
    });

  return combined;
}

export default function Prompts() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [prompts, setPrompts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState({});
  const [source, setSource] = useState("shared");
  const [categorySource, setCategorySource] = useState("derived");

  const load = useCallback(async () => {
    const assetsPromise = listAssets().catch((error) => {
      console.warn("Prompt Library branding could not be loaded.", error);
      return [];
    });

    try {
      const [promptRows, categoryRows, assetRows] = await Promise.all([
        listPrompts(),
        listPromptCategories().catch((error) => {
          if (!categoryTableIsMissing(error)) {
            console.warn("Shared prompt categories could not be loaded.", error);
          }
          return null;
        }),
        assetsPromise,
      ]);
      const nextCategories = normalizedCategories(categoryRows, promptRows);
      setCategories(nextCategories);
      setPrompts(sortPromptRows(promptRows, nextCategories));
      setAssets(assetMap(assetRows));
      setSource("shared");
      setCategorySource(categoryRows ? "shared" : "derived");
    } catch (error) {
      if (!tableIsMissing(error)) {
        console.warn("Shared prompts are temporarily unavailable; using the bundled starter library.", error);
      }
      const nextCategories = normalizedCategories(null, STARTER_PROMPTS);
      setCategories(nextCategories);
      setPrompts(sortPromptRows(STARTER_PROMPTS, nextCategories));
      setAssets(assetMap(await assetsPromise));
      setSource("starter");
      setCategorySource("derived");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (source !== "shared") return undefined;
    return subscribePrompts(() => {
      listPrompts()
        .then((rows) => {
          setPrompts(sortPromptRows(rows, categories));
          setCategories((current) => normalizedCategories(
            categorySource === "shared" ? current.filter((category) => category.id) : null,
            rows,
          ));
        })
        .catch((error) => console.warn("Couldn't refresh the Prompt Library.", error));
    });
  }, [categories, categorySource, source]);

  useEffect(() => {
    if (categorySource !== "shared") return undefined;
    return subscribePromptCategories(() => {
      listPromptCategories()
        .then((rows) => setCategories(normalizedCategories(rows, prompts || [])))
        .catch((error) => console.warn("Couldn't refresh prompt categories.", error));
    });
  }, [categorySource, prompts]);

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
    setPrompts((current) => sortPromptRows([...current, created], categories));
    navigate(`/prompts/${created.slug}`);
    return created;
  };

  const handleUpdatePrompt = async (prompt, patch) => {
    const updated = await updatePrompt(prompt.id, {
      ...patch,
      version: (prompt.version || 1) + 1,
      updated_by: profile?.id || null,
    });
    setPrompts((current) => sortPromptRows(
      current.map((item) => item.id === updated.id ? updated : item),
      categories,
    ));
    return updated;
  };

  const handleDeletePrompt = async (prompt) => {
    await deletePrompt(prompt.id);
    const remaining = prompts.filter((item) => item.id !== prompt.id);
    setPrompts(remaining);
    if (prompt.slug === slug) {
      navigate(remaining.length ? `/prompts/${remaining[0].slug}` : "/prompts", { replace: true });
    }
  };

  const handleCreateCategory = async (name) => {
    if (!profile?.id || !profile?.team_id) {
      throw new Error("Your team profile is still loading. Try again in a moment.");
    }
    const normalizedName = name.trim();
    if (categories.some((category) => category.name.toLowerCase() === normalizedName.toLowerCase())) {
      throw new Error("That category already exists.");
    }
    const created = await createPromptCategory({
      team_id: profile.team_id,
      name: normalizedName,
      sort_order: Math.max(0, ...categories.map((category) => category.sort_order || 0)) + 10,
      created_by: profile.id,
    });
    setCategories((current) => normalizedCategories([...current.filter((item) => item.id), created], prompts));
    return created;
  };

  const handleDeleteCategory = async (category, fallbackCategory) => {
    if (!fallbackCategory) throw new Error("Create another category before deleting the last category.");
    await deletePromptCategory(category.id);
    setCategories((current) => current.filter((item) => item.id !== category.id));
    setPrompts((current) => sortPromptRows(current.map((prompt) => (
      prompt.category === category.name ? { ...prompt, category: fallbackCategory.name } : prompt
    )), categories.filter((item) => item.id !== category.id)));
  };

  return (
    <PromptLibrary
      prompts={prompts}
      categories={categories}
      assets={assets}
      source={source}
      userEmail={user?.email}
      isAdmin={isAdmin}
      currentUserId={profile?.id}
      activeSlug={slug}
      onSelectPrompt={(prompt) => navigate(`/prompts/${prompt.slug}`)}
      onOpenDesign={() => navigate("/design")}
      onOpenPrototypes={() => navigate("/")}
      onOpenTracking={() => navigate("/tracking")}
      onOpenAdmin={() => navigate("/admin")}
      onSignOut={signOut}
      onCreatePrompt={source === "shared" ? handleCreatePrompt : undefined}
      onUpdatePrompt={source === "shared" ? handleUpdatePrompt : undefined}
      onDeletePrompt={source === "shared" ? handleDeletePrompt : undefined}
      onCreateCategory={categorySource === "shared" ? handleCreateCategory : undefined}
      onDeleteCategory={categorySource === "shared" ? handleDeleteCategory : undefined}
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
