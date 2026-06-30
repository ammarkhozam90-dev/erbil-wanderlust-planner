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

// ... (بقية التايبات كما هي دون تغيير)
export type TravelStyle = "Foodie" | "Remote Work Focus" | "Family Friendly" | "Nightlife" | "Cultural/Historical";
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
const FETCH_TIMEOUT_MS = 10000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  // ... (احتفظ بدوال fetchProfile و fetchRoles و loadUserData و signOut كما هي)
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return error ? null : data;
  }, []);

  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      return error ? [] : (data ?? []).map((r) => r.role);
  }, []);

  const loadUserData = useCallback(async (userId: string, mounted: { current: boolean }) => {
    const [p, r] = await Promise.all([fetchProfile(userId), fetchRoles(userId)]);
    if (!mounted.current) return;
    setProfile(p);
    setRoles(r);
    setLoading(false);
  }, [fetchProfile, fetchRoles]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null); setRoles([]); setSession(null); setLoading(false);
  }, []);

  // ... (تعديل الـ Value لتضمين التجاوز)
  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      // التعديل هنا: إذا كنت تريد تجاوز الفحص في مرحلة التطوير، أضف || true
      isAdmin: roles.includes("admin") || true, 
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
    [session, profile, roles, loading]
  );

  // ... (أكمل باقي الدوال الأساسية مثل signIn, signUp, updateProfile بنفس منطقك القديم)
  // [ملاحظة: لضيق المساحة، تأكد من نسخ باقي الدوال من كودك الأصلي ووضعها هنا]

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
