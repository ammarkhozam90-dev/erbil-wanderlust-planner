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
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.error("[auth] fetch profile error", error);
        return null;
      }
      return data;
    } catch (e) {
      console.error("[auth] unexpected fetch profile error", e);
      return null;
    }
  }, []);

  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) {
        console.error("[auth] fetch roles error", error);
        return [];
      }
      return (data ?? []).map((r) => r.role);
    } catch (e) {
      console.error("[auth] unexpected fetch roles error", e);
      return [];
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        if (!data.session) {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      } catch (e) {
        console.error("[auth] init session error", e);
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      
      if (event === "SIGNED_OUT" || !newSession) {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      } else if (newSession) {
        const userId = newSession.user.id;
        setLoading(true);
        const [p, r] = await Promise.all([fetchProfile(userId), fetchRoles(userId)]);
        if (mounted) {
          setProfile(p);
          setRoles(r);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile, fetchRoles]);

  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "DELETE") setProfile(null);
          else if (payload.new) setProfile(payload.new as Profile);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const refetchProfile = useCallback(async () => {
    if (!session?.user) return;
    const p = await fetchProfile(session.user.id);
    if (p) setProfile(p);
  }, [session?.user?.id, fetchProfile]);

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
      const prev = profileRef.current;
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, extras: SignUpExtras) => {
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
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    // Note: This directly updates the password. For production-grade security, 
    // you might want to re-authenticate the user first.
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }, []);

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
