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
// business rather than assuming a single global business.
// Note: Auto-creation is disabled to support the Claim Business flow.
export async function ensureMerchant(userId: string, _email: string): Promise<Merchant | null> {
  const existing = await supabase.from('merchants').select('*').eq('owner_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle();
  return existing.data as Merchant | null;
}
