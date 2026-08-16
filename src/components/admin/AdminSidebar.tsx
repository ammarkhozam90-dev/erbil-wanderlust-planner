import { Link, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ShieldCheck, Building2, Images, Tags, Users,
  Flag, BarChart3, ScrollText, Settings as SettingsIcon, LogOut, Map, Palette, History, UploadCloud,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';

const items = [
  { title: 'Dashboard',          url: '/admin',            icon: LayoutDashboard },
  { title: 'Merchant Approvals', url: '/admin/approvals',  icon: ShieldCheck },
  { title: 'Approval History',   url: '/admin/approval-history', icon: History },
  { title: 'Businesses',         url: '/admin/businesses', icon: Building2 },
  { title: 'Bulk Import',        url: '/admin/import',     icon: UploadCloud },
  { title: 'Tour Management',    url: '/admin/tours',      icon: Map },
  { title: 'Photos',             url: '/admin/photos',     icon: Images },
  { title: 'Categories',         url: '/admin/categories', icon: Tags },
  { title: 'Users',              url: '/admin/users',      icon: Users },
  { title: 'Reports',            url: '/admin/reports',    icon: Flag },
  { title: 'Analytics',          url: '/admin/analytics',  icon: BarChart3 },
  { title: 'Activity Log',       url: '/admin/activity',   icon: ScrollText },
  { title: 'Site Content',       url: '/admin/site-content', icon: Palette },
  { title: 'Settings',           url: '/admin/settings',   icon: SettingsIcon },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Live count of merchant listings actually waiting on the admin — shown
  // as a red badge so nothing pending gets forgotten under other work.
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['admin-pending-merchant-count'],
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('merchants')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.url === '/admin/approvals' && pendingCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-none text-white">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/';
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
