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

export type TravelStyle = "Foodie" | "Remote Work Focus" | "Family Friendly" | "Nightlife" | "Cultural/Historical";
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
  signUp: (email: string, password: string, extras: SignUpExtras) => Promise<{ error: string | null; needsConfirm: boolean }>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (userId: string) => {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setProfile(p);
    setRoles((r ?? []).map((x) => x.role));
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadUserData(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      if (session?.user) loadUserData(session.user.id);
      else { setProfile(null); setRoles([]); }
    });
    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signOut = async () => { await supabase.auth.signOut(); };
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, extras: SignUpExtras) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: extras.fullName } } });
    return { error: error?.message ?? null, needsConfirm: !!data.user && !data.session };
  };

  const updateProfile = async (patch: any) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", session?.user?.id ?? "");
    return { error: error?.message ?? null };
  };

  // دوال إضافية (يمكنك تركها فارغة مؤقتاً أو تنفيذها لاحقاً حسب مشروعك)
  const toggleFavorite = async (id: string) => {};
  const incrementItineraries = async () => {};
  const refetchProfile = async () => session?.user && loadUserData(session.user.id);
  const resetPassword = async (email: string) => ({ error: null });
  const updatePassword = async (newPassword: string) => ({ error: null });
  const changePassword = async (current: string, next: string) => ({ error: null });
  const deleteAccount = async () => ({ error: null });

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    roles,
    isAdmin: roles.includes("admin"), // تم إزالة "|| true" لأنها كانت تمنح صلاحيات أدمن لكل مستخدم
    isMerchant: roles.includes("merchant"),
    loading,
    signIn, signUp, signOut, updateProfile, toggleFavorite, incrementItineraries,
    refetchProfile, resetPassword, updatePassword, changePassword, deleteAccount
  }), [session, profile, roles, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
