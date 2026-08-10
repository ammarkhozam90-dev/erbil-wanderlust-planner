import { supabase } from '@/integrations/supabase/client';
import type { Merchant } from '@/integrations/supabase/types-local';
import { useMerchantContext } from './merchant-context';

// Back-compat wrapper: every existing page calls `useMyMerchant(userId)`
// expecting `{ data, isLoading }` for "the" merchant. Now that an account
// can own several businesses, this returns whichever one is currently
// selected in the Business Switcher — so no other page needs to change.
export function useMyMerchant(_userId: string | undefined) {
  const { currentMerchant, isLoading } = useMerchantContext();
  return { data: currentMerchant as Merchant | null, isLoading };
}

// Kept for any legacy call sites — resolves to the currently selected
// business (or creates one) rather than assuming a single global business.
export async function ensureMerchant(userId: string, email: string): Promise<Merchant> {
  const existing = await supabase.from('merchants').select('*').eq('owner_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (existing.data) return existing.data as Merchant;
  const { data, error } = await supabase
    .from('merchants')
    .insert({ owner_id: userId, email, name: '' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Merchant;
}
