import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // دالة التحقق الأساسية
    async function initAuth() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    }

    initAuth();

    // الاستماع لتغييرات الجلسة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await checkAdminStatus(s.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkAdminStatus(userId: string) {
    // ⚠️ column is `role`, not `app_role` — `app_role` is the enum TYPE
    // name, not a column on user_roles. Querying it as a column throws a
    // 400 on every single auth check (see console: repeated "Auth Error"
    // + failed requests to .../user_roles?...app_role=eq.admin).
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error("Auth Error:", error);
      setIsAdmin(false);
    } else {
      setIsAdmin(!!data);
    }
  }

  return { session, user, loading, isAdmin };
}
