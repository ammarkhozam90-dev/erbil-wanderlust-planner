import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/merchant/auth')({
  component: MerchantAuthRedirect,
});

function MerchantAuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect all traffic from /merchant/auth to the unified /auth page
    navigate({ to: '/auth', replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Redirecting to login…
    </div>
  );
}
