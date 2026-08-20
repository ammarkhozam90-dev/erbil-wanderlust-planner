import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

// The submit checklist + button now live at the bottom of the unified
// My Business page. This route stays in place (the sidebar still links
// here) and just forwards to that section.
export const Route = createFileRoute('/merchant/_authenticated/submit')({
  component: SubmitRedirect,
});

function SubmitRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: '/merchant/my-business', hash: 'section-submit', replace: true });
  }, [navigate]);
  return <div className="text-muted-foreground">Redirecting…</div>;
}
