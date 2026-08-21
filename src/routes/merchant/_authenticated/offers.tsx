import { createFileRoute } from '@tanstack/react-router';
import { OffersManager } from '@/components/offers/OffersManager';

export const Route = createFileRoute('/merchant/_authenticated/offers')({
  component: MerchantOffers,
});

function MerchantOffers() {
  return <OffersManager />;
}
