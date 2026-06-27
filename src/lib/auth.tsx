import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { registerItineraryBump } from "@/lib/store";
import type { Database } from "@/integrations/supabase/types";

export type TravelStyle =
  | "Foodie"
  | "Remote Work Focus"
  | "Family Friendly"
  | "Nightlife"
  | "Cultural/Historical";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface SignUpExtras {
  fullName: string;
  phone?: string;
  ageRange?: string;
  gender?: string;
  nationality?: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isMerchant: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    extras: SignUpExtras,
  ) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Database["public"]["Tables"]["profiles"]["Update"]>) => Promise<{ error: string | null }>;
  toggleFavorite: (id: string) => Promise<void>;
  incrementItineraries: () => Promise<void>;
  refetchProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log(`[auth] fetching profile for ${userId}...`);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.error("[auth] fetch profile error:", error.message);
        return null;
      }
      return data;
    } catch (e) {
      console.error("[auth] unexpected fetch profile error:", e);
      return null;
    }
  }, []);

  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    console.log(`[auth] fetching roles for ${userId}...`);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) {
        console.error("[auth] fetch roles error:", error.message);
        return [];
      }
      return (data ?? []).map((r) => r.role);
    } catch (e) {
      console.error("[auth] unexpected fetch roles error:", e);
      return [];
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (!session?.user) return;
    const p = await fetchProfile(session.user.id);
    if (p) setProfile(p);
  }, [session?.user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    
    const initSession = async () => {
      console.log("[auth] initializing session...");
      setLoading(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(initialSession);
        if (initialSession) {
          console.log("[auth] active session found, fetching data...");
          const userId = initialSession.user.id;
          const [p, r] = await Promise.all([fetchProfile(userId), fetchRoles(userId)]);
          if (mounted) {
            setProfile(p);
            setRoles(r);
            console.log("[auth] data loaded successfully");
          }
        } else {
          console.log("[auth] no active session found");
          setProfile(null);
          setRoles([]);
        }
      } catch (e) {
        console.error("[auth] init session failed:", e);
      } finally {
        if (mounted) {
          setLoading(false);
          console.log("[auth] initialization complete, loading=false");
        }
      }
    };

    initSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      console.log(`[auth] state change event: ${event}`);
      
      setSession(newSession);
      
      if (event === "SIGNED_OUT" || !newSession) {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        const userId = newSession.user.id;
        setLoading(true);
        try {
          const [p, r] = await Promise.all([fetchProfile(userId), fetchRoles(userId)]);
          if (mounted) {
            setProfile(p);
            setRoles(r);
          }
        } catch (e) {
          console.error(`[auth] failed to load data after ${event}:`, e);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile, fetchRoles]);

  // Real-time profile sync
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          console.log("[auth] real-time profile update received");
          if (payload.eventType === "DELETE") setProfile(null);
          else if (payload.new) setProfile(payload.new as Profile);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Focus refetch
  useEffect(() => {
    const onFocus = () => refetchProfile();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetchProfile();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetchProfile]);

  const updateProfile = useCallback(
    async (patch: Partial<Database["public"]["Tables"]["profiles"]["Update"]>): Promise<{ error: string | null }> => {
      if (!session?.user) return { error: "Not signed in" };
      console.log("[auth] updating profile...");
      const prev = profileRef.current;
      // Optimistic update
      if (prev) setProfile({ ...prev, ...patch } as Profile);
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .update(patch)
          .eq("id", session.user.id)
          .select()
          .maybeSingle();
        if (error) {
          if (prev) setProfile(prev);
          return { error: error.message };
        }
        if (data) setProfile(data as Profile);
        return { error: null };
      } catch (e) {
        if (prev) setProfile(prev);
        return { error: (e as Error).message };
      }
    },
    [session?.user?.id],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const p = profileRef.current;
      if (!p) return;
      const next = p.favorites.includes(id)
        ? p.favorites.filter((x) => x !== id)
        : [...p.favorites, id];
      await updateProfile({ favorites: next });
    },
    [updateProfile],
  );

  const incrementItineraries = useCallback(async () => {
    const p = profileRef.current;
    if (!p) return;
    await updateProfile({ itineraries_generated: p.itineraries_generated + 1 });
  }, [updateProfile]);

  useEffect(() => {
    registerItineraryBump(() => {
      if (profileRef.current) void incrementItineraries();
    });
    return () => registerItineraryBump(() => {});
  }, [incrementItineraries]);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log("[auth] signing in...");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: (e as Error).message };
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, extras: SignUpExtras) => {
      console.log("[auth] signing up...");
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: extras.fullName,
              phone: extras.phone,
              age_range: extras.ageRange,
              gender: extras.gender,
              nationality: extras.nationality,
            },
          },
        });
        if (error) return { error: error.message, needsConfirm: false };
        return { error: null, needsConfirm: !data.session };
      } catch (e) {
        return { error: (e as Error).message, needsConfirm: false };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    console.log("[auth] signing out...");
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("[auth] sign out error:", e);
    } finally {
      setProfile(null);
      setRoles([]);
      setSession(null);
      setLoading(false);
      console.log("[auth] sign out complete");
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log("[auth] requesting password reset...");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    console.log("[auth] updating password...");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: (e as Error).message };
    } finally {
      setLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    console.log("[auth] changing password with re-authentication...");
    if (!session?.user?.email) return { error: "No user session" };
    
    setLoading(true);
    try {
      // 1. Re-authenticate
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      
      if (signInError) {
        console.error("[auth] re-authentication failed:", signInError.message);
        return { error: "Incorrect current password" };
      }
      
      // 2. Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) return { error: updateError.message };
      
      console.log("[auth] password changed successfully");
      return { error: null };
    } catch (e) {
      console.error("[auth] change password unexpected error:", e);
      return { error: (e as Error).message };
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      isAdmin: roles.includes("admin"),
      isMerchant: roles.includes("merchant"),
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      toggleFavorite,
      incrementItineraries,
      refetchProfile,
      resetPassword,
      updatePassword,
      changePassword,
    }),
    [
      session,
      profile,
      roles,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      toggleFavorite,
      incrementItineraries,
      refetchProfile,
      resetPassword,
      updatePassword,
      changePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export const PASSWORD_RULES = [
  { id: "len", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "num", label: "One number (0–9)", test: (p: string) => /[0-9]/.test(p) },
] as const;

export function validatePassword(p: string): { ok: boolean; failed: string[] } {
  const failed = PASSWORD_RULES.filter((r) => !r.test(p)).map((r) => r.label);
  return { ok: failed.length === 0, failed };
}
