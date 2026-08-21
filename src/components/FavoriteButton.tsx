import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function FavoriteButton({ merchantId, className = '' }: { merchantId: string; className?: string }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ['favorite-state', session?.user?.id, merchantId];

  const favorite = useQuery({
    queryKey: key,
    enabled: Boolean(session?.user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from('user_favorites' as any).select('id').eq('user_id', session!.user.id).eq('merchant_id', merchantId).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 1000 * 60 * 5,
  });

  async function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!session?.user) {
      toast('Sign in to save places to your favorites.');
      navigate({ to: '/auth' });
      return;
    }

    const isSaved = Boolean(favorite.data);
    const request = isSaved
      ? supabase.from('user_favorites' as any).delete().eq('user_id', session.user.id).eq('merchant_id', merchantId)
      : supabase.from('user_favorites' as any).insert({ user_id: session.user.id, merchant_id: merchantId });
    const { error } = await request;
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: key });
    await qc.invalidateQueries({ queryKey: ['favorites', session.user.id] });
    toast.success(isSaved ? 'Removed from favorites.' : 'Saved to your favorites.');
  }

  return (
    <button type="button" onClick={toggle} aria-label={favorite.data ? 'Remove from favorites' : 'Add to favorites'} className={cn('grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition-all hover:scale-105 hover:border-gold/60 hover:text-gold', className)}>
      <Heart className={cn('h-4.5 w-4.5 transition-all', favorite.data && 'fill-gold text-gold')} />
    </button>
  );
}
