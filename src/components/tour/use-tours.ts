import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tour } from '@/integrations/supabase/tour-types';

export function useMyTours(organizerId: string | undefined) {
  return useQuery({
    queryKey: ['my-tours', organizerId],
    enabled: !!organizerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tours').select('*')
        .eq('organizer_id', organizerId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tour[];
    },
  });
}

export function useSelectedTour() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('erbilgo:selected_tour_id');
}
export function setSelectedTour(id: string) {
  localStorage.setItem('erbilgo:selected_tour_id', id);
}
