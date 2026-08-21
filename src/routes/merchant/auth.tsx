import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export const Route = createFileRoute('/merchant/auth')({
  component: MerchantAuthRedirect,
});

function MerchantAuthRedirect() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      // If already logged in, go to dashboard
      navigate({ to: '/merchant/dashboard', replace: true });
    } else {
      // If not logged in, go to unified auth page
      navigate({ to: '/auth', replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Redirecting…
    </div>
  );
}
