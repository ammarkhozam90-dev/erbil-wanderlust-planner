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
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: string | null }>;
  toggleFavorite: (id: string) => Promise<void>;
  incrementItineraries: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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
    if (!data) return null;
    return data as Profile;
  }, []);

  // Initial session + subscribe to auth changes
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (!data.session) {
        setProfile(null);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_OUT" || !newSession) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Whenever session changes, always re-fetch profile from DB (no cache trust)
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    setLoading(true);
    let cancelled = false;

    const load = async () => {
      let p = await fetchProfile(userId);
      // Trigger should have created the row; race-guard by inserting if missing
      if (!p) {
        await supabase
          .from("profiles")
          .insert({
            id: userId,
            full_name:
              (session.user.user_metadata?.full_name as string | undefined) ??
              session.user.email?.split("@")[0] ??
              "",
          })
          .select()
          .maybeSingle();
        p = await fetchProfile(userId);
      }
      if (!cancelled) {
        setProfile(p);
        setLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, fetchProfile]);

  // Realtime: push DB changes from any device into local state
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setProfile(null);
          } else if (payload.new) {
            setProfile(payload.new as Profile);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Refetch on tab focus / visibility change so devices stay in sync
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
      // Optimistic
      const prev = profileRef.current;
      if (prev) setProfile({ ...prev, ...patch } as Profile);

      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", session.user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("[auth] update profile error", error);
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

  // Hook store's generatePlan/surpriseMe into the authed counter
  useEffect(() => {
    registerItineraryBump(() => {
      if (profileRef.current) {
        void incrementItineraries();
      }
    });
    return () => registerItineraryBump(() => {});
  }, [incrementItineraries]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName },
        },
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      toggleFavorite,
      incrementItineraries,
      refetchProfile,
    }),
    [
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      toggleFavorite,
      incrementItineraries,
      refetchProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
