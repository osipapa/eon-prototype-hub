import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DesignGuide from "@/features/design/DesignGuide";
import { useAuth } from "@/lib/auth";
import { cacheEonLogo } from "@/lib/branding";
import { listAssets } from "@/lib/data";

export default function Design() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { slug = "overview" } = useParams();
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
      assets={assets || {}}
      logoLoading={assets === null}
      userEmail={user?.email}
      isAdmin={isAdmin}
      onSelectPage={(page) => navigate(`/design/${page.slug}`)}
      onOpenPrototypes={() => navigate("/")}
      onOpenPrompts={() => navigate("/prompts")}
      onOpenAdmin={() => navigate("/admin")}
      onSignOut={signOut}
    />
  );
}
