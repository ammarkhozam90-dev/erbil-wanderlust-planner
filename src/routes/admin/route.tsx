import { createFileRoute, Outlet, Navigate } from '@tanstack/react-router';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAdminRole } from '@/components/admin/use-admin-role';
import { Header } from '@/components/Header';
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

  // FIX: this used to redirect to "/merchant/auth" (the merchant sign-in
  // page) by mistake — an admin with no session has nothing to do there.
  // Send them to the homepage instead, where they can sign in normally.
  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex w-full">
        {/* السيدبار بدون أي هيدر فوقه لتفادي التراكب */}
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          {/* الهيدر الرئيسي للموقع — جوا عمود المحتوى بس، فبيضل ثابت
              بكل صفحات لوحة الأدمن بدون ما يتراكب فوق القائمة الجانبية */}
          <Header />

          {/* هيدر ثانوي صغير خاص بلوحة الأدمن (زر فتح/طي القائمة، موبايل بس) */}
          <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border/60 bg-background/90 px-4 backdrop-blur md:hidden">
            <SidebarTrigger aria-label="Open Admin Panel" className="h-10 w-full justify-start gap-3 px-2 text-sm font-semibold">
              <span>Admin Panel</span>
            </SidebarTrigger>
          </header>

          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
