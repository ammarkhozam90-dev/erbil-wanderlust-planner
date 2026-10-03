import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';

// A separate icon from <NotificationBell/> on purpose — booking requests
// only live here, so they never mix in with whatever else ends up in the
// general notifications list. Invisible to anyone who isn't an admin or a
// tour organizer; admins see every pending booking, organizers see only
// their own (RLS on tour_bookings already scopes the same query both ways).
export function BookingNotificationIcon() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const { data: org } = useMyOrganizer(isAdmin ? undefined : user?.id);
  const role: 'admin' | 'organizer' | null = isAdmin ? 'admin' : org ? 'organizer' : null;

  const { data: count = 0 } = useQuery({
    queryKey: ['header-pending-bookings', role],
    enabled: !!role,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tour_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (!role) return null;

  return (
    <Link
      to={role === 'admin' ? '/admin/bookings' : '/tour/bookings'}
      aria-label="Booking requests"
      className="relative grid h-9 w-9 place-items-center rounded-full border border-border/70 text-muted-foreground transition-all hover:border-gold/60 hover:text-gold"
    >
      <ClipboardCheck className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
