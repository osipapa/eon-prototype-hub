import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TrackingLibrary from "@/features/tracking/TrackingLibrary";
import { useAuth } from "@/lib/auth";
import { cacheEonLogo } from "@/lib/branding";
import { listAssets } from "@/lib/data";

export default function Tracking() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState(null);

  useEffect(() => {
    listAssets()
      .then((rows) => {
        const nextAssets = Object.fromEntries((rows || []).map((item) => [item.key, item.url]));
        cacheEonLogo(nextAssets.eonLogo);
        setAssets({ ...nextAssets, eonLogo: nextAssets.eonLogo || null });
      })
      .catch((error) => {
        console.warn("Tracking branding could not be loaded.", error);
        setAssets({ eonLogo: null });
      });
  }, []);

  return (
    <TrackingLibrary
      assets={assets || {}}
      logoLoading={assets === null}
      userEmail={user?.email}
      isAdmin={isAdmin}
      onOpenDesign={() => navigate("/design")}
      onOpenPrototypes={() => navigate("/")}
      onOpenPrompts={() => navigate("/prompts/mixpanel-tracking-setup")}
      onOpenAdmin={() => navigate("/admin")}
      onSignOut={signOut}
    />
  );
}
