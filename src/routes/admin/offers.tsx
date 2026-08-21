import { createFileRoute } from '@tanstack/react-router';
import { OffersManager } from '@/components/offers/OffersManager';

export const Route = createFileRoute('/admin/offers')({
  component: AdminOffers,
});

function AdminOffers() {
  return <OffersManager admin />;
}
