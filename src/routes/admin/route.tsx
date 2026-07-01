import { createFileRoute, Outlet, Navigate, Link } from '@tanstack/react-router';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAdminRole } from '@/components/admin/use-admin-role';
import { toast } from 'sonner';
import { useEffect } from 'react';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading, isAdmin } = useAdminRole();

  useEffect(() => {
    if (!loading && user && !isAdmin) toast.error('Access Denied — admin role required.');
  }, [loading, user, isAdmin]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/merchant/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <Link to="/admin" className="font-display text-sm font-semibold">ErbilGo Admin</Link>
            <div className="ml-auto text-xs text-muted-foreground">{user.email}</div>
          </header>
          <main className="flex-1 p-6"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
