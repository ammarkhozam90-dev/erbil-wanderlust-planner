import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard, ShieldCheck, Building2, Images, Tags, Users,
  Flag, BarChart3, ScrollText, Settings as SettingsIcon, LogOut,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';

const items = [
  { title: 'Dashboard',          url: '/admin',            icon: LayoutDashboard },
  { title: 'Merchant Approvals', url: '/admin/approvals',  icon: ShieldCheck },
  { title: 'Businesses',         url: '/admin/businesses', icon: Building2 },
  { title: 'Photos',             url: '/admin/photos',     icon: Images },
  { title: 'Categories',         url: '/admin/categories', icon: Tags },
  { title: 'Users',              url: '/admin/users',      icon: Users },
  { title: 'Reports',            url: '/admin/reports',    icon: Flag },
  { title: 'Analytics',          url: '/admin/analytics',  icon: BarChart3 },
  { title: 'Activity Log',       url: '/admin/activity',   icon: ScrollText },
  { title: 'Settings',           url: '/admin/settings',   icon: SettingsIcon },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
                      <span>{item.title}</span>
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
