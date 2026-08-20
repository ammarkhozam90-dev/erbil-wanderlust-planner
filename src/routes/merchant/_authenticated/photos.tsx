import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

// Photos now lives as a section inside the unified My Business page.
// This route stays in place (in case anything still links here) and just
// forwards to that section.
export const Route = createFileRoute('/merchant/_authenticated/photos')({
  component: PhotosRedirect,
});

function PhotosRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: '/merchant/my-business', hash: 'section-photos', replace: true });
  }, [navigate]);
  return <div className="text-muted-foreground">Redirecting…</div>;
}
