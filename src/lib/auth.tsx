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

export type TravelStyle =
  | "Foodie"
  | "Remote Work Focus"
  | "Family Friendly"
  | "Nightlife"
  | "Cultural/Historical";

export type AppRole = "admin" | "merchant" | "user";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  preferred_lang: string;
  travel_styles: string[];
  favorites: string[];
  itineraries_generated: number;
  created_at: string;
  updated_at: string;
  age_range: string | null;
  gender: string | null;
  nationality: string | null;
  current_city: string | null;
  travel_companion: string | null;
  mobility_level: string | null;
  budget_preference: string | null;
  dietary_preferences: string[];
  interests: string[];
  travel_style_prefs: Record<string, string>;
  onboarding_complete: boolean;
}

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
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: string | null }>;
  toggleFavorite: (id: string) => Promise<void>;
  incrementItineraries: () => Promise<void>;
  refetchProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("[auth] fetch profile error", error);
      return null;
    }
    return (data as Profile | null) ?? null;
  }, []);

  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) {
      console.error("[auth] fetch roles error", error);
      return [];
    }
    return (data ?? []).map((r: { role: AppRole }) => r.role);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (!data.session) {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_OUT" || !newSession) {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    setLoading(true);
    let cancelled = false;
    const load = async () => {
      let p = await fetchProfile(userId);
      if (!p) {
        await supabase.from("profiles").insert({
          id: userId,
          full_name:
            (session.user.user_metadata?.full_name as string | undefined) ??
            session.user.email?.split("@")[0] ??
            "",
        });
        p = await fetchProfile(userId);
      }
      const r = await fetchRoles(userId);
      if (!cancelled) {
        setProfile(p);
        setRoles(r);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, fetchProfile, fetchRoles]);

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
    async (patch: Partial<Profile>): Promise<{ error: string | null }> => {
      if (!session?.user) return { error: "Not signed in" };
      const prev = profileRef.current;
      if (prev) setProfile({ ...prev, ...patch } as Profile);
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

      // If session is present (auto-confirm on), patch profile right away
      if (data.session && data.user) {
        await supabase
          .from("profiles")
          .update({
            full_name: extras.fullName,
            phone: extras.phone ?? "",
            age_range: extras.ageRange ?? null,
            gender: extras.gender ?? null,
            nationality: extras.nationality ?? null,
          })
          .eq("id", data.user.id);
      }
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
