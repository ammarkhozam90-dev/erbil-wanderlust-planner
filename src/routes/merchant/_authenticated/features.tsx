import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyMerchant } from '@/components/merchant/use-my-merchant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/merchant/_authenticated/features')({
  component: Features,
});

const FEATURE_OPTIONS = [
  'WiFi', 'Parking', 'Outdoor Seating', 'Family Friendly', 'Pet Friendly',
  'Wheelchair Accessible', 'Delivery', 'Takeaway', 'Reservations', 'Live Music',
  'Smoking Area', 'Card Payment', 'Halal', 'Vegan Options', 'Kids Play Area',
  'Air Conditioning', 'Power Outlets', 'Private Rooms',
];

function Features() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: m } = useMyMerchant(user?.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (m) setSelected(m.features ?? []); }, [m]);
  if (!m) return <div className="text-muted-foreground">Set up your business first.</div>;

  function toggle(f: string) {
    setSelected((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('merchants').update({ features: selected }).eq('id', m!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    qc.invalidateQueries({ queryKey: ['my-merchant', user?.id] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Features & Tags</h2>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Select all that apply</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FEATURE_OPTIONS.map((f) => {
              const active = selected.includes(f);
              return (
                <button key={f} onClick={() => toggle(f)} type="button">
                  <Badge
                    variant={active ? 'default' : 'outline'}
                    className={cn('cursor-pointer px-3 py-1.5 text-sm', active && 'bg-primary')}
                  >
                    {f}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
