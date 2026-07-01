import { createFileRoute, Outlet, Navigate } from '@tanstack/react-router';
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
    if (!loading && user && !isAdmin) {
      toast.error('Access Denied — admin role required.');
    }
  }, [loading, user, isAdmin]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!user) return <Navigate to="/merchant/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex w-full">
        {/* السيدبار يظهر بجانب المحتوى */}
        <AdminSidebar />
        
        <div className="flex flex-1 flex-col">
          {/* هذا الهيدر يظهر فقط في الموبايل لفتح السيدبار */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-semibold">Admin Panel</span>
          </header>
          
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
