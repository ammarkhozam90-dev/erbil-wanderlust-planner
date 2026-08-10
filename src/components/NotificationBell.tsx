import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export function NotificationBell() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', session?.user?.id],
    enabled: !!session,
    refetchInterval: 30000, // light polling — good enough without a realtime subscription
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!session) return null;

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  async function markRead(n: any) {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      qc.invalidateQueries({ queryKey: ['notifications', session?.user?.id] });
    }
    setOpen(false);
    if (n.link) navigate({ to: n.link });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        {notifications.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">You're all caught up.</p>
        )}
        {notifications.map((n: any) => (
          <DropdownMenuItem key={n.id} onSelect={() => markRead(n)} className="flex flex-col items-start gap-0.5 whitespace-normal py-2">
            <span className={`text-sm ${!n.is_read ? 'font-semibold' : ''}`}>
              {!n.is_read && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-gold align-middle" />}
              {n.title}
            </span>
            {n.message && <span className="text-xs text-muted-foreground">{n.message}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
