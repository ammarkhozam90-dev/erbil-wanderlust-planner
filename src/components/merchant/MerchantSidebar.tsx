import { Link, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  GitBranch,
  Eye,
  Send,
  LogOut,
  ChevronsUpDown,
  Plus,
  Store,
  Search,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useMerchantContext } from './merchant-context';
import { toast } from 'sonner';

// Photos, Opening Hours, Features & Tags, and AI Planning Info used to be
// separate nav items — they're now sections inside the single My Business
// page (with a sticky in-page nav to jump between them), so they no longer
// need their own sidebar entries.
const items = [
  { title: 'Dashboard', url: '/merchant/dashboard', icon: LayoutDashboard },
  { title: 'Claim a Business', url: '/merchant/claim', icon: Search },
  { title: 'My Business', url: '/merchant/my-business', icon: Building2 },
  { title: 'Branches', url: '/merchant/branches', icon: GitBranch },
  { title: 'Preview', url: '/merchant/preview', icon: Eye },
  { title: 'Submit for Review', url: '/merchant/submit', icon: Send },
];

export function MerchantSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { merchants, currentMerchant, setCurrentMerchantId, createBusiness } = useMerchantContext();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  async function onCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createBusiness(newName.trim());
      toast.success('Business added');
      setShowAdd(false);
      setNewName('');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not create business');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Business Switcher — lets one account manage several businesses
            (e.g. a hotel with a restaurant, cafe, bar, and its own tours). */}
        <SidebarGroup>
          <SidebarGroupContent>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-accent">
                  <Store className="h-4 w-4 shrink-0 text-gold" />
                  <span className="flex-1 truncate font-medium">{currentMerchant?.name || 'Untitled business'}</span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {merchants.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onSelect={() => setCurrentMerchantId(m.id)}
                    className={m.id === currentMerchant?.id ? 'bg-accent' : ''}
                  >
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <span className="truncate">{m.name || 'Untitled business'}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">{m.category}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <Dialog open={showAdd} onOpenChange={setShowAdd}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Plus className="mr-2 h-4 w-4" /> Add another business
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add a new business</DialogTitle>
                    </DialogHeader>
                    <Input
                      autoFocus
                      placeholder="Business name (e.g. Restaurant, Cafe, Tours)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <DialogFooter>
                      <Button onClick={onCreate} disabled={creating || !newName.trim()}>
                        {creating ? 'Creating…' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
