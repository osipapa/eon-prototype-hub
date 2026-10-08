import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import DesignGuide, { DEFAULT_DESIGN_PAGE } from "@/features/design/DesignGuide";
import { useKnowledgeBase } from "@/features/design/useKnowledgeBase";
import { useAuth } from "@/lib/auth";
import { cacheEonLogo } from "@/lib/branding";
import { listAssets } from "@/lib/data";

export default function Design() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { slug = DEFAULT_DESIGN_PAGE } = useParams();
  const [search] = useSearchParams();
  const kb = useKnowledgeBase({ teamId: profile?.team_id, userId: profile?.id });
  const [assets, setAssets] = useState(null);

  useEffect(() => {
    listAssets()
      .then((rows) => {
        const nextAssets = Object.fromEntries((rows || []).map((item) => [item.key, item.url]));
        cacheEonLogo(nextAssets.eonLogo);
        setAssets({ ...nextAssets, eonLogo: nextAssets.eonLogo || null });
      })
      .catch((error) => {
        console.warn("Eon Design branding could not be loaded.", error);
        setAssets({ eonLogo: null });
      });
  }, []);

  return (
    <DesignGuide
      activeSlug={slug}
      activeSection={search.get("s")}
      kb={kb}
      assets={assets || {}}
      logoLoading={assets === null}
      userEmail={user?.email}
      isAdmin={isAdmin}
      onSelectPage={(nextSlug, section) => navigate(`/design/${nextSlug}${section ? `?s=${section}` : ""}`)}
      onOpenRoute={(route) => navigate(route)}
      onOpenPrototypes={() => navigate("/")}
      onOpenPrompts={() => navigate("/prompts")}
      onOpenAdmin={() => navigate("/admin")}
      onSignOut={signOut}
    />
  );
}
