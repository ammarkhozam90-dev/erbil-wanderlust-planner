// Shared helpers for the paid-sponsorship system.

export type Currency = 'USD' | 'IQD';
export type CampaignStatus = 'pending' | 'active' | 'rejected' | 'cancelled';

export interface Campaign {
  id: string;
  merchant_id: string;
  placements: string[];
  start_date: string;
  end_date: string;
  days: number;
  bonus_days: number;
  currency: Currency;
  base_amount: number;
  discount_amount: number;
  total_amount: number;
  offer_title: string | null;
  status: CampaignStatus;
  payment_method: string | null;
  payment_reference: string | null;
  admin_note: string | null;
  created_at: string;
  merchants?: { name: string; phone: string | null; whatsapp: string | null; email: string | null } | null;
}

export interface Pricing {
  placement_key: string;
  label: string;
  price_usd: number;
  price_iqd: number;
  max_slots: number;
  enabled: boolean;
  sort_order: number;
}

/** Today's date in Erbil (UTC+3) as YYYY-MM-DD — matches the database's erbil_today(). */
export function erbilToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
}

export function money(n: number, currency: Currency): string {
  return currency === 'IQD'
    ? `${Math.round(Number(n)).toLocaleString('en-US')} IQD`
    : `$${Number(n).toFixed(2)}`;
}

/** Real-time phase of a campaign (an "active" row that has run out is shown as Ended). */
export function phaseOf(c: Pick<Campaign, 'status' | 'start_date' | 'end_date'>, today = erbilToday()) {
  if (c.status !== 'active') return c.status;
  if (today < c.start_date) return 'scheduled';
  if (today > c.end_date) return 'ended';
  return 'running';
}

export function placementLabel(key: string, pricing?: Pricing[]) {
  return pricing?.find((p) => p.placement_key === key)?.label ?? key;
}
