import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "./AppContext";

const defaultAuthValue = {
  signIn: async () => {},
  signOut: async () => {},
  loading: false,
  userProfile: null,
  profileError: null,
  updateProfile: async () => {},
  completeOnboarding: async () => {},
};

const AuthContext = createContext(defaultAuthValue);

export function AuthProvider({ children }) {
  const { setRole } = useApp();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const syncAuth = useCallback(async () => {
    setProfileError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("[Auth] getSession failed:", sessionError.message);
        setProfileError(null);
        setRole(null);
        setUserProfile(null);
        return;
      }
      if (!session?.user) {
        setProfileError(null);
        setRole(null);
        setUserProfile(null);
        return;
      }
      const { data: profile, error: profileErr } = await supabase
        .from("user_profiles")
        .select("role, display_name, branch, phone, onboarding_completed_at, avatar_url")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profileErr) {
        console.error("[Auth] user_profiles fetch failed:", profileErr.message);
        setProfileError(`Profile fetch failed: ${profileErr.message}`);
        setRole(null);
        setUserProfile(null);
        return;
      }
      if (profile?.role) {
        setRole(profile.role);
        setUserProfile({
          id: session.user.id,
          role: profile.role,
          displayName: profile.display_name || session.user.email?.split("@")[0] || "there",
          branch: profile.branch ?? null,
          phone: profile.phone ?? null,
          email: session.user.email ?? null,
          onboardingCompletedAt: profile.onboarding_completed_at ?? null,
          avatarUrl: profile.avatar_url ?? null,
        });
      } else {
        setProfileError("No profile found. Run: npm run seed:users");
        setRole(null);
        setUserProfile(null);
      }
    } catch (err) {
      console.error("[Auth] syncAuth error:", err);
      setRole(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, [setRole]);

  useEffect(() => {
    syncAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      syncAuth();
    });
    // Fallback: if auth hangs (e.g. network), show login after 10s
    const t = setTimeout(() => setLoading((prev) => (prev ? false : prev)), 10000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [syncAuth]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRole(null);
  }, [setRole]);

  const updateProfile = useCallback(async (updates) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", session.user.id);
    if (error) throw error;
    await syncAuth();
  }, [syncAuth]);

  const completeOnboarding = useCallback(async () => {
    await updateProfile({ onboarding_completed_at: new Date().toISOString() });
  }, [updateProfile]);

  return (
    <AuthContext.Provider value={{ signIn, signOut, loading, userProfile, profileError, updateProfile, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
