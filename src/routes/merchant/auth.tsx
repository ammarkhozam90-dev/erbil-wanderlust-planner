import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link } from '@tanstack/react-router';
import { useSiteSettings } from '@/lib/site-settings';

export const Route = createFileRoute('/merchant/auth')({
  component: MerchantAuthRedirect,
});

function MerchantAuthRedirect() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { settings, loaded } = useSiteSettings();
  const closed = loaded && !settings.merchants.registrations_open && !user;

  useEffect(() => {
    if (loading || !loaded || closed) return;

    if (user) {
      // If already logged in, go to dashboard
      navigate({ to: '/merchant/dashboard', replace: true });
    } else {
      // If not logged in, go to unified auth page
      navigate({ to: '/auth', replace: true });
    }
  }, [user, loading, loaded, closed, navigate]);

  if (closed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="font-display text-3xl font-bold">Registrations paused</h1>
          <p className="text-muted-foreground">{settings.merchants.closed_message}</p>
          <p className="text-sm text-muted-foreground">
            Already a partner? <Link to="/auth" className="font-semibold text-gold underline">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Redirecting…
    </div>
  );
}
