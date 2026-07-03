import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard, Map, Images, Route, DollarSign,
  CalendarCheck, Eye, Send, LogOut,
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
  { title: 'Route Planner',    url: '/tour/route',        icon: Route },
  { title: 'Pricing',          url: '/tour/pricing',      icon: DollarSign },
  { title: 'Availability',     url: '/tour/availability', icon: CalendarCheck },
  { title: 'Preview',          url: '/tour/preview',      icon: Eye },
  { title: 'Submit for Review',url: '/tour/submit',       icon: Send },
];

export function TourSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const active = (u: string) => path === u || path.startsWith(u + '/');

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
                      <span>{i.title}</span>
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
