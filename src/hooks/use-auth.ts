import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // تحديث الجلسة والمستخدم
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) checkAdminStatus(s.user.id);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) checkAdminStatus(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // دالة للتحقق من صلاحية الأدمن
  async function checkAdminStatus(userId: string) {
    // تم تعديل الاستعلام ليطابق اسم العمود app_role والقيمة admin كما هو موضح في قاعدة بياناتك
    const { data } = await supabase
      .from('user_roles')
      .select('app_role')
      .eq('user_id', userId)
      .eq('app_role', 'admin')
      .maybeSingle();

    setIsAdmin(!!data);
  }

  return { session, user, loading, isAdmin };
}
