import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TourOrganizer } from '@/integrations/supabase/tour-types';

export function useMyOrganizer(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-organizer', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tour_organizers').select('*').eq('owner_id', userId!).maybeSingle();
      if (error) throw error;
      return (data as TourOrganizer | null) ?? null;
    },
  });
}

export async function ensureOrganizer(userId: string, email: string, companyName = ''): Promise<TourOrganizer> {
  const existing = await supabase.from('tour_organizers').select('*').eq('owner_id', userId).maybeSingle();
  if (existing.data) return existing.data as TourOrganizer;
  const { data, error } = await supabase
    .from('tour_organizers')
    .insert({ owner_id: userId, contact_email: email, company_name: companyName })
    .select('*').single();
  if (error) throw error;
  return data as TourOrganizer;
}
