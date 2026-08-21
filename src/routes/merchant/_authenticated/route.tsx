import { createFileRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { MerchantSidebar } from '@/components/merchant/MerchantSidebar';
import { Header } from '@/components/Header';
import { MerchantProvider, useMerchantContext } from '@/components/merchant/merchant-context';
import { useAuth } from '@/hooks/use-auth';

export const Route = createFileRoute('/merchant/_authenticated')({
  ssr: false,
  component: MerchantLayout,
});

function MerchantLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSetupPage = pathname.includes('/merchant/my-business');

  useEffect(() => {
    if (!loading && !user) navigate({ to: '/auth' });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  // The setup wizard owns the entire viewport. Do not render the portal header
  // first, otherwise the old shell can flash for one frame during navigation.
  if (isSetupPage) {
    return (
      <MerchantProvider userId={user.id} email={user.email}>
        <MerchantLayoutContent />
      </MerchantProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MerchantProvider userId={user.id} email={user.email}>
        <MerchantLayoutContent />
      </MerchantProvider>
    </div>
  );
}

function MerchantLayoutContent() {
  const { merchants, isLoading } = useMerchantContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) {
    return <div className="flex h-[calc(100vh-64px)] items-center justify-center text-muted-foreground">Loading portal…</div>;
  }

  const hasBusiness = merchants.length > 0;
  const isSetupPage = pathname.includes('/merchant/my-business');

  // Immersive mode: No sidebar for setup page OR if user has no business yet
  if (isSetupPage || !hasBusiness) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-background">
        <Outlet />
      </main>
    );
  }

  // Standard portal mode: Full sidebar layout
  return (
    <div className="relative" style={{ transform: 'translateZ(0)' }}>
      <SidebarProvider>
        <div className="flex w-full">
          <MerchantSidebar />
          <div className="flex flex-1 flex-col">
            <header className="flex h-14 items-center gap-3 border-b px-4">
              <SidebarTrigger />
              <h1 className="font-display text-lg font-semibold">
                <span className="text-primary">Erbil</span>
                <span className="text-gold">Go</span> Merchant
              </h1>
            </header>
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
