import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TourSidebar } from '@/components/tour/TourSidebar';
import { useAuth } from '@/hooks/use-auth';
import { ensureOrganizer } from '@/components/tour/use-my-organizer';

export const Route = createFileRoute('/tour/_authenticated')({
  ssr: false,
  component: TourLayout,
});

function TourLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: '/tour/login' });
      return;
    }
    // Every tour organizer needs a row in tour_organizers before any tour
    // reads/writes will pass RLS. This used to never run anywhere, so the
    // portal was permanently stuck showing an empty state.
    ensureOrganizer(
      user.id,
      user.email ?? '',
      (user.user_metadata as Record<string, string> | undefined)?.company_name ?? '',
    )
      .catch(() => {
        // Non-fatal: page-level queries will just come back empty and the
        // user can retry from "My Tours".
      })
      .finally(() => setReady(true));
  }, [loading, user, navigate]);

  if (loading || !user || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <div className="flex w-full">
          <TourSidebar />
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border/60 bg-background/90 px-4 backdrop-blur">
              <SidebarTrigger
                aria-label="Open Tour Organizer Portal"
                className="h-10 w-full justify-start gap-3 px-2 text-sm font-semibold"
              >
                <span>
                  <span className="text-primary">Erbil</span>
                  <span className="text-gold">Go</span> Tour Organizer Portal
                </span>
              </SidebarTrigger>
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
