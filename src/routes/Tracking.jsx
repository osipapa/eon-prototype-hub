import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TrackingLibrary from "@/features/tracking/TrackingLibrary";
import { useAuth } from "@/lib/auth";
import { cacheEonLogo } from "@/lib/branding";
import { listAssets } from "@/lib/data";

export default function Tracking() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState({});

  useEffect(() => {
    listAssets()
      .then((rows) => {
        const nextAssets = Object.fromEntries((rows || []).map((item) => [item.key, item.url]));
        cacheEonLogo(nextAssets.eonLogo);
        setAssets(nextAssets);
      })
      .catch((error) => console.warn("Tracking branding could not be loaded.", error));
  }, []);

  return (
    <TrackingLibrary
      assets={assets}
      userEmail={user?.email}
      isAdmin={isAdmin}
      onOpenPrototypes={() => navigate("/")}
      onOpenPrompts={() => navigate("/prompts/mixpanel-tracking-setup")}
      onOpenAdmin={() => navigate("/admin")}
      onSignOut={signOut}
    />
  );
}
