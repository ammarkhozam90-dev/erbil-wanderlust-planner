import { Link, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Map, Images, Route, DollarSign,
  CalendarCheck, Eye, Send, LogOut, ClipboardList,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from '@tanstack/react-router';

const items = [
  { title: 'Dashboard',        url: '/tour/dashboard',    icon: LayoutDashboard },
  { title: 'My Tours',         url: '/tour/tours',        icon: Map },
  { title: 'Gallery',          url: '/tour/gallery',      icon: Images },
  { title: 'Route Planner',    url: '/tour/route-planner',        icon: Route },
  { title: 'Pricing',          url: '/tour/pricing',      icon: DollarSign },
  { title: 'Availability',     url: '/tour/availability', icon: CalendarCheck },
  { title: 'Bookings',         url: '/tour/bookings',     icon: ClipboardList },
  { title: 'Preview',          url: '/tour/preview',      icon: Eye },
  { title: 'Submit for Review',url: '/tour/submit',       icon: Send },
];

export function TourSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const active = (u: string) => path === u || path.startsWith(u + '/');

  // RLS already scopes tour_bookings to this organizer's own tours, so no
  // need to look up their organizer/tour ids first — just count pending.
  // This is the only signal an organizer gets that a request came in, since
  // there's no email/SMS notification wired up yet.
  const { data: pendingBookings = 0 } = useQuery({
    queryKey: ['organizer-pending-bookings-count'],
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

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: '/tour/login' });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tour Organizer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={active(i.url)}>
                    <Link to={i.url} className="flex items-center gap-2">
                      <i.icon className="h-4 w-4" />
                      <span className="flex-1">{i.title}</span>
                      {i.url === '/tour/bookings' && pendingBookings > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-none text-white">
                          {pendingBookings > 99 ? '99+' : pendingBookings}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-3">
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
