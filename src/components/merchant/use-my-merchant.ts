import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Merchant } from '@/integrations/supabase/types-local';

export function useMyMerchant(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-merchant', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('owner_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Merchant | null) ?? null;
    },
  });
}

export async function ensureMerchant(userId: string, email: string): Promise<Merchant> {
  const existing = await supabase.from('merchants').select('*').eq('owner_id', userId).maybeSingle();
  if (existing.data) return existing.data as Merchant;
  const { data, error } = await supabase
    .from('merchants')
    .insert({ owner_id: userId, email, name: '' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Merchant;
}
