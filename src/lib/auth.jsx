import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { TUTORIAL_METADATA_KEY, validTutorialPersona } from "../features/onboarding/tutorial";

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

  useEffect(() => {
    const userId = session?.user?.id;
    if (!isSupabaseConfigured || !userId) return undefined;
    const channel = supabase
      .channel(`profile-tutorial-${userId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${userId}`,
      }, ({ new: nextProfile }) => {
        if (nextProfile?.id === userId) setProfile(nextProfile);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  const saveTutorialPersona = useCallback(async (persona) => {
    const valid = validTutorialPersona(persona);
    if (!session?.user?.id || !valid) return null;
    const { data, error } = await supabase
      .from("profiles")
      .update({ tutorial_persona: valid })
      .eq("id", session.user.id)
      .select("*")
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  }, [session?.user?.id]);

  const completeTutorial = useCallback(async (persona) => {
    if (!session?.user) return null;
    const completedAt = new Date().toISOString();
    const valid = validTutorialPersona(persona) || validTutorialPersona(profile?.tutorial_persona);
    const { data: nextProfile, error: profileError } = await supabase
      .from("profiles")
      .update({
        tutorial_completed_at: completedAt,
        ...(valid ? { tutorial_persona: valid } : {}),
      })
      .eq("id", session.user.id)
      .select("*")
      .single();
    if (profileError) throw profileError;
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
    setProfile(nextProfile);
    return completedAt;
  }, [profile?.tutorial_persona, session?.user]);

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
    saveTutorialPersona,
    completeTutorial,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
