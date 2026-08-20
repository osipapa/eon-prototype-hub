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
  const [assets, setAssets] = useState({});

  useEffect(() => {
    listAssets()
      .then((rows) => {
        const nextAssets = Object.fromEntries((rows || []).map((item) => [item.key, item.url]));
        cacheEonLogo(nextAssets.eonLogo);
        setAssets(nextAssets);
      })
      .catch((error) => console.warn("Eon Design branding could not be loaded.", error));
  }, []);

  return (
    <DesignGuide
      activeSlug={slug}
      assets={assets}
      userEmail={user?.email}
      isAdmin={isAdmin}
      onSelectPage={(page) => navigate(`/design/${page.slug}`)}
      onOpenPrototypes={() => navigate("/")}
      onOpenPrompts={() => navigate("/prompts")}
      onOpenTracking={() => navigate("/tracking")}
      onOpenAdmin={() => navigate("/admin")}
      onSignOut={signOut}
    />
  );
}
