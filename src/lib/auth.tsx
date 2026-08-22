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
import type { Database } from "@/integrations/supabase/types";

export type TravelStyle =
  | "Adventure"
  | "Nature"
  | "History & Culture"
  | "Luxury"
  | "Family"
  | "Photography"
  | "Relaxing"
  | "Nightlife"
  | "Food"
  | "Budget"
  | "Social"
  | "Cozy"
  | "Remote Work Focus"
  | "Solo Explorer";
export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// PASSWORD_RULES must be an array of rule objects (used with .map() in auth.tsx
// to render the live checklist under the password field).
export const PASSWORD_RULES: { id: string; label: string; test: (v: string) => boolean }[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "One number", test: (v) => /\d/.test(v) },
];

export const PASSWORD_ERROR_MESSAGE =
  "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, and a number.";

// validatePassword returns an object with .ok so it can be used directly as
// `const pwd = validatePassword(form.password); ... pwd.ok` in auth.tsx.
export const validatePassword = (password: string): { ok: boolean; message: string | null } => {
  const ok = PASSWORD_RULES.every((rule) => rule.test(password));
  return { ok, message: ok ? null : PASSWORD_ERROR_MESSAGE };
};

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
  updateProfile: (
    patch: Partial<Database["public"]["Tables"]["profiles"]["Update"]>,
  ) => Promise<{ error: string | null }>;
  toggleFavorite: (id: string) => Promise<void>;
  incrementItineraries: () => Promise<void>;
  refetchProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  signOutOtherSessions: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const initializingRef = useRef(true);
  const activeUserIdRef = useRef<string | null>(null);

  const loadUserData = useCallback(async (userId: string) => {
    console.log("[auth] fetching profile and roles", { userId });
    setLoading(true);
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

      if (profileResult.error) {
        console.error("[auth] profile fetch failed", profileResult.error);
      }
      if (rolesResult.error) {
        console.error("[auth] roles fetch failed", rolesResult.error);
      }

      if (activeUserIdRef.current !== userId) return;

      setProfile(profileResult.data ?? null);
      setRoles((rolesResult.data ?? []).map((row) => row.role));
    } catch (error) {
      console.error("[auth] profile loading failed", error);
      setProfile(null);
      setRoles([]);
    } finally {
      setLoading(false);
      console.log("[auth] profile loading finished", { userId });
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      console.log("[auth] initializing session...");
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;

        setSession(initialSession);
        activeUserIdRef.current = initialSession?.user?.id ?? null;
        if (initialSession?.user) {
          await loadUserData(initialSession.user.id);
        } else {
          setProfile(null);
          setRoles([]);
        }
      } catch (error) {
        console.error("[auth] session initialization failed", error);
        if (mounted) {
          setSession(null);
          setProfile(null);
          setRoles([]);
        }
      } finally {
        if (mounted) {
          initializingRef.current = false;
          setLoading(false);
          console.log("[auth] initialization finished");
        }
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log("[auth] state change event", event);
      if (!mounted || initializingRef.current) return;

      setSession(nextSession);
      if (!nextSession?.user || event === "SIGNED_OUT") {
        activeUserIdRef.current = null;
        setProfile(null);
        setRoles([]);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        activeUserIdRef.current = nextSession.user.id;
        void loadUserData(nextSession.user.id);
      }
      // TOKEN_REFRESHED only updates the session. It must not refetch the
      // profile or trigger sign-out, which prevents refresh-induced flicker.
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    console.trace("[auth] signOut called");
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[auth] signOut failed", error);
    } finally {
      activeUserIdRef.current = null;
      setSession(null);
      setProfile(null);
      setRoles([]);
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, extras: SignUpExtras) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: extras.fullName,
          phone: extras.phone ?? null,
          age_range: extras.ageRange ?? null,
          gender: extras.gender ?? null,
          nationality: extras.nationality ?? null,
        },
      },
    });
    if (error) return { error: error.message, needsConfirm: false };

    // Safety net: explicitly write the extra fields onto the profiles row too,
    // in case the DB trigger only maps full_name. Wrapped in try/catch so that
    // if this fails (e.g. no active session yet because email confirmation is
    // required, and RLS blocks the update), it NEVER breaks the signup flow
    // or blocks navigation to /profile.
    if (data.user && data.session) {
      try {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            phone: extras.phone ?? null,
            nationality: extras.nationality ?? null,
            age_range: extras.ageRange ?? null,
            gender: extras.gender ?? null,
          })
          .eq("id", data.user.id);
        if (profileError) {
          console.warn("[signUp] could not back-fill profile fields:", profileError.message);
        }
      } catch (err) {
        console.warn("[signUp] profile back-fill threw:", err);
      }
    }

    return { error: null, needsConfirm: !!data.user && !data.session };
  }, []);

  const updateProfile = useCallback(
    async (patch: any) => {
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", session?.user?.id ?? "");
      if (!error) {
        setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
      }
      return { error: error?.message ?? null };
    },
    [session?.user?.id],
  );

  // دوال إضافية (يمكنك تركها فارغة مؤقتاً أو تنفيذها لاحقاً حسب مشروعك)
  const toggleFavorite = useCallback(async (id: string) => {}, []);
  const incrementItineraries = useCallback(async () => {}, []);
  const refetchProfile = useCallback(
    async () => session?.user && loadUserData(session.user.id),
    [session?.user, loadUserData],
  );
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset-password`,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!session?.user?.email) return { error: "No active session" };

      // 1. Re-authenticate
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: current,
      });
      if (reAuthError) return { error: "Incorrect current password" };

      // 2. Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) return { error: updateError.message };

      // 3. Sign out (as requested by user)
      await signOut();

      return { error: null };
    },
    [session?.user?.email, signOut],
  );

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc("delete_user_account");
    if (error) return { error: error.message };
    await signOut();
    return { error: null };
  }, [signOut]);

  const signOutOtherSessions = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    return { error: error?.message ?? null };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      isAdmin: roles.includes("admin"), // تم إزالة "|| true" لأنها كانت تمنح صلاحيات أدمن لكل مستخدم
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
      signOutOtherSessions,
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
      signOutOtherSessions,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
