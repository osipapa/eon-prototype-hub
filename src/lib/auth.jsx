import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { TUTORIAL_METADATA_KEY } from "../features/onboarding/tutorial";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await loadProfile(s?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const completeTutorial = useCallback(async () => {
    if (!session?.user) return null;
    const completedAt = new Date().toISOString();
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(session.user.user_metadata || {}),
        [TUTORIAL_METADATA_KEY]: completedAt,
      },
    });
    if (error) throw error;
    if (data.user) {
      setSession((current) => current ? { ...current, user: data.user } : current);
    }
    return completedAt;
  }, [session?.user]);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isAdmin: profile?.role === "admin",
    loading,
    configured: isSupabaseConfigured,
    signInWithPassword: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    refreshProfile: () => loadProfile(session?.user?.id),
    completeTutorial,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
