import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Building2,
  Images,
  Clock,
  Tags,
  Sparkles,
  Eye,
  Send,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';

const items = [
  { title: 'Dashboard', url: '/merchant/dashboard', icon: LayoutDashboard },
  { title: 'My Business', url: '/merchant/my-business', icon: Building2 },
  { title: 'Photos', url: '/merchant/photos', icon: Images },
  { title: 'Opening Hours', url: '/merchant/hours', icon: Clock },
  { title: 'Features & Tags', url: '/merchant/features', icon: Tags },
  { title: 'AI Planning Info', url: '/merchant/ai-planning', icon: Sparkles },
  { title: 'Preview', url: '/merchant/preview', icon: Eye },
  { title: 'Submit for Review', url: '/merchant/submit', icon: Send },
];

export function MerchantSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Merchant Portal</SidebarGroupLabel>
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
                    // التعديل هنا: التوجيه للصفحة الرئيسية لفرض ظهور الهيدر
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
