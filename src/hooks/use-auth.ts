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
      checkAdminStatus(s?.user?.id);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      checkAdminStatus(data.session?.user?.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // دالة للتحقق من صلاحية الأدمن
  async function checkAdminStatus(userId?: string) {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    
    // يمكنك تعديل هذا الاستعلام حسب اسم الجدول في قاعدة بياناتك
    // هنا نفترض أن لديك جدول اسمه user_roles يحتوي على user_id و role
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(!!data);
  }

  return { session, user, loading, isAdmin };
}
