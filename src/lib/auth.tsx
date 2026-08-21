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
  deleteAccount: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const FETCH_TIMEOUT_MS = 10000; // 10 seconds timeout for profile/roles fetch

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;
  
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

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

  const loadUserData = useCallback(async (userId: string, mounted: { current: boolean }) => {
    console.log(`[auth] loading user data for ${userId}...`);
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn(`[auth] data fetch timed out after ${FETCH_TIMEOUT_MS}ms`);
        resolve(null);
      }, FETCH_TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([
        Promise.all([fetchProfile(userId), fetchRoles(userId)]),
        timeoutPromise
      ]);

      if (!mounted.current) return;

      if (result && Array.isArray(result)) {
        const [p, r] = result;
        setProfile(p);
        setRoles(r);
        console.log("[auth] user data loaded successfully");
      } else {
        console.warn("[auth] user data loading failed or timed out");
      }
    } catch (e) {
      console.error("[auth] loadUserData unexpected error:", e);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [fetchProfile, fetchRoles]);

  const refetchProfile = useCallback(async () => {
    if (!sessionRef.current?.user) return;
    const p = await fetchProfile(sessionRef.current.user.id);
    if (p) setProfile(p);
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    console.group("[auth] signOut trace");
    console.trace("[auth] signOut triggered from:");
    console.groupEnd();
    
    setLoading(true);
    try {
      await supabase.auth.signOut();
      console.log("[auth] Supabase signOut successful");
    } catch (e) {
      console.error("[auth] Supabase signOut error:", e);
    } finally {
      setProfile(null);
      setRoles([]);
      setSession(null);
      setLoading(false);
      console.log("[auth] signOut cleanup complete");
    }
  }, []);

  useEffect(() => {
    const mounted = { current: true };
    
    const initSession = async () => {
      console.log("[auth] initializing session...");
      setLoading(true);
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted.current) return;
        
        console.log(`[auth] initial getSession result: ${initialSession ? "session found" : "no session"}`);
        setSession(initialSession);
        
        if (initialSession) {
          await loadUserData(initialSession.user.id, mounted);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      } catch (e) {
        console.error("[auth] init session failed:", e);
        if (mounted.current) setLoading(false);
      }
    };

    initSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted.current) return;
      console.log(`[auth] onAuthStateChange event: ${event}`);
      
      const prevSession = sessionRef.current;
      setSession(newSession);
      
      if (!newSession) {
        console.log("[auth] session is null, clearing user data");
        setProfile(null);
        setRoles([]);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN") {
        if (!prevSession || prevSession.user.id !== newSession.user.id) {
          await loadUserData(newSession.user.id, mounted);
        } else {
          console.log("[auth] SIGNED_IN event for existing session, skipping full reload");
          setLoading(false);
        }
      } else if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        console.log(`[auth] ${event} event received, ensuring data is present`);
        if (!profileRef.current) {
          await loadUserData(newSession.user.id, mounted);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUserData]);

  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const channel = supabase
      .channel(`profile-sync:${userId}`)
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
      if (!sessionRef.current?.user) return { error: "Not signed in" };
      console.log("[auth] updateProfile called");
      const prev = profileRef.current;
      if (prev) setProfile({ ...prev, ...patch } as Profile);
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .update(patch)
          .eq("id", sessionRef.current.user.id)
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
    [],
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
    console.log("[auth] signIn called");
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
      console.log("[auth] signUp called");
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

  const resetPassword = useCallback(async (email: string) => {
    console.log("[auth] resetPassword called");
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
    console.log("[auth] updatePassword called");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      console.log("[auth] updatePassword success, logging out for security...");
      await signOut();
      
      return { error: null };
    } catch (e) {
      console.error("[auth] updatePassword failed:", e);
      return { error: (e as Error).message };
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    console.log("[auth] changePassword called (with re-auth)");
    const currentEmail = sessionRef.current?.user?.email;
    if (!currentEmail) return { error: "No user session" };
    
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });
      
      if (signInError) {
        console.error("[auth] re-auth failed:", signInError.message);
        return { error: "Incorrect current password" };
      }
      
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      
      console.log("[auth] changePassword success, logging out...");
      await signOut();
      
      return { error: null };
    } catch (e) {
      console.error("[auth] changePassword failed:", e);
      return { error: (e as Error).message };
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  const deleteAccount = useCallback(async () => {
    console.log("[auth] deleteAccount called");
    setLoading(true);
    try {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) throw error;
      
      console.log("[auth] account deletion successful, clearing state...");
      await signOut();
      return { error: null };
    } catch (e) {
      console.error("[auth] deleteAccount failed:", e);
      return { error: (e as Error).message };
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  const value = useMemo(
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
      deleteAccount,
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
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export const PASSWORD_RULES = [
  { id: "len", label: "At least 8 characters", test: (s: string) => s.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (s: string) => /[A-Z]/.test(s) },
  { id: "lower", label: "One lowercase letter", test: (s: string) => /[a-z]/.test(s) },
  { id: "num", label: "One number", test: (s: string) => /[0-9]/.test(s) },
];

export function validatePassword(s: string) {
  const failed = PASSWORD_RULES.filter((r) => !r.test(s));
  return { ok: failed.length === 0, failed };
}
