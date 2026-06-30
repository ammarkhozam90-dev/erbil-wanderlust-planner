import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyMerchant } from '@/components/merchant/use-my-merchant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { MerchantHour } from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/merchant/_authenticated/hours')({
  component: Hours,
});

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function emptyHours(): MerchantHour[] {
  return DAYS.map((_, i) => ({
    id: `tmp-${i}`, merchant_id: '', day_of_week: i,
    is_closed: false, is_24h: false, open_time: '09:00', close_time: '22:00',
  }));
}

function Hours() {
  const { user } = useAuth();
  const { data: m } = useMyMerchant(user?.id);
  const qc = useQueryClient();
  const [rows, setRows] = useState<MerchantHour[]>(emptyHours());
  const [saving, setSaving] = useState(false);

  const hoursQ = useQuery({
    queryKey: ['merchant-hours', m?.id],
    enabled: !!m?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_hours').select('*').eq('merchant_id', m!.id).order('day_of_week');
      if (error) throw error;
      return (data ?? []) as MerchantHour[];
    },
  });

  useEffect(() => {
    if (!hoursQ.data) return;
    const map = new Map(hoursQ.data.map((h) => [h.day_of_week, h]));
    setRows(emptyHours().map((d) => map.get(d.day_of_week) ?? d));
  }, [hoursQ.data]);

  if (!m) return <div className="text-muted-foreground">Set up your business first.</div>;

  async function save() {
    setSaving(true);
    const payload = rows.map((r) => ({
      merchant_id: m!.id,
      day_of_week: r.day_of_week,
      is_closed: r.is_closed,
      is_24h: r.is_24h,
      open_time: r.is_24h || r.is_closed ? null : r.open_time,
      close_time: r.is_24h || r.is_closed ? null : r.close_time,
    }));
    const { error } = await supabase.from('merchant_hours').upsert(payload, { onConflict: 'merchant_id,day_of_week' });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Hours saved');
    qc.invalidateQueries({ queryKey: ['merchant-hours', m!.id] });
  }

  function update(i: number, patch: Partial<MerchantHour>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Opening Hours</h2>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Weekly schedule</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 items-center gap-3 rounded border p-3 md:grid-cols-[110px_1fr_1fr_auto_auto]">
              <div className="font-medium">{DAYS[row.day_of_week]}</div>
              <Input
                type="time" value={row.open_time ?? '09:00'}
                disabled={row.is_closed || row.is_24h}
                onChange={(e) => update(i, { open_time: e.target.value })}
              />
              <Input
                type="time" value={row.close_time ?? '22:00'}
                disabled={row.is_closed || row.is_24h}
                onChange={(e) => update(i, { close_time: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={row.is_24h} onCheckedChange={(v) => update(i, { is_24h: v, is_closed: false })} />
                24h
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={row.is_closed} onCheckedChange={(v) => update(i, { is_closed: v, is_24h: false })} />
                Closed
              </label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
