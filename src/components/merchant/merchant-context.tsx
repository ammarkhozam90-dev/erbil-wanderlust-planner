import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Merchant } from '@/integrations/supabase/types-local';

const CURRENT_MERCHANT_KEY = 'erbilgo_current_merchant_id';

interface MerchantContextValue {
  merchants: Merchant[];
  isLoading: boolean;
  currentMerchant: Merchant | null;
  setCurrentMerchantId: (id: string) => void;
  createBusiness: (name: string) => Promise<Merchant>;
  refetch: () => void;
}

const MerchantContext = createContext<MerchantContextValue | undefined>(undefined);

export function MerchantProvider({
  userId,
  email,
  children,
}: {
  userId: string | undefined;
  email: string | undefined | null;
  children: ReactNode;
}) {
  const qc = useQueryClient();

  const { data: merchants = [], isLoading, refetch } = useQuery({
    queryKey: ['my-merchants', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('owner_id', userId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Merchant[];
    },
  });

  const [currentMerchantId, setCurrentMerchantIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(CURRENT_MERCHANT_KEY);
  });

  // If the account has zero businesses yet, silently create the first one
  // (keeps the old "one business per account" experience seamless for
  // existing merchants — they never see an empty state).
  useEffect(() => {
    if (!userId || isLoading) return;
    if (merchants.length === 0) {
      supabase
        .from('merchants')
        .insert({ owner_id: userId, email: email ?? undefined, name: '' })
        .select('*')
        .single()
        .then(({ data }) => {
          if (data) qc.invalidateQueries({ queryKey: ['my-merchants', userId] });
        });
    } else if (!currentMerchantId || !merchants.some((m) => m.id === currentMerchantId)) {
      setCurrentMerchantIdState(merchants[0].id);
    }
  }, [userId, isLoading, merchants, currentMerchantId, email, qc]);

  function setCurrentMerchantId(id: string) {
    setCurrentMerchantIdState(id);
    if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_MERCHANT_KEY, id);
  }

  async function createBusiness(name: string) {
    if (!userId) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('merchants')
      .insert({ owner_id: userId, email: email ?? undefined, name })
      .select('*')
      .single();
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['my-merchants', userId] });
    setCurrentMerchantId(data.id);
    return data as Merchant;
  }

  const currentMerchant = useMemo(
    () => merchants.find((m) => m.id === currentMerchantId) ?? merchants[0] ?? null,
    [merchants, currentMerchantId],
  );

  const value: MerchantContextValue = {
    merchants,
    isLoading,
    currentMerchant,
    setCurrentMerchantId,
    createBusiness,
    refetch,
  };

  return <MerchantContext.Provider value={value}>{children}</MerchantContext.Provider>;
}

export function useMerchantContext() {
  const ctx = useContext(MerchantContext);
  if (!ctx) throw new Error('useMerchantContext must be used within a MerchantProvider');
  return ctx;
}
