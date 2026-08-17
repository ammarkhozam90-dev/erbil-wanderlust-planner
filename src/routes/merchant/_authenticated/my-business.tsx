import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { ensureMerchant, useMyMerchant } from '@/components/merchant/use-my-merchant';
import { MapPicker } from '@/components/merchant/MapPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { BusinessCategory } from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/merchant/_authenticated/my-business')({
  component: MyBusiness,
});

const CATEGORIES: BusinessCategory[] = ['restaurant', 'cafe', 'hotel', 'attraction', 'shop', 'activity', 'other'];

function MyBusiness() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: m, isLoading } = useMyMerchant(user?.id);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!m && user?.email && user?.id && !isLoading) {
      ensureMerchant(user.id, user.email).then(() =>
        qc.invalidateQueries({ queryKey: ['my-merchant', user.id] }),
      );
    }
    if (m && !form) {
      setForm({ ...m, categories: (m as any).categories?.length ? (m as any).categories : [m.category] });
    }
  }, [m, user, isLoading, qc, form]);

  if (isLoading || !form) return <div className="text-muted-foreground">Loading…</div>;

  function update<K extends string>(key: K, value: unknown) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function toggleCategory(c: BusinessCategory) {
    setForm((f: any) => {
      const current: BusinessCategory[] = f.categories ?? [];
      if (current.includes(c)) {
        if (current.length === 1) return f; // keep at least one category selected
        return { ...f, categories: current.filter((x) => x !== c) };
      }
      return { ...f, categories: [...current, c] };
    });
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('merchants')
      .update({
        name: form.name, categories: form.categories, description: form.description,
        phone: form.phone, email: form.email, website: form.website,
        address: form.address, city: form.city,
        latitude: form.latitude, longitude: form.longitude,
        instagram: form.instagram, facebook: form.facebook,
        tiktok: form.tiktok, whatsapp: form.whatsapp,
      } as any)
      .eq('id', form.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    qc.invalidateQueries({ queryKey: ['my-merchant', user?.id] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">My Business</h2>
          <p className="text-sm text-muted-foreground">Basic info, location & socials.</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Basic info</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Business name</Label>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Categories</Label>
            <p className="text-xs text-muted-foreground">Select every category that applies — e.g. a hotel with its own restaurant and cafe.</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = (form.categories ?? []).includes(c);
                return (
                  <button key={c} type="button" onClick={() => toggleCategory(c)}>
                    <Badge
                      variant={active ? 'default' : 'outline'}
                      className={cn('cursor-pointer px-3 py-1.5 text-sm capitalize', active && 'bg-primary')}
                    >
                      {c}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contact email</Label>
            <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => update('website', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Click on the map or drag the pin to set the exact location.</p>
          <MapPicker
            lat={form.latitude}
            lng={form.longitude}
            onChange={(lat, lng) => setForm((f: any) => ({ ...f, latitude: lat, longitude: lng }))}
          />
          {form.latitude != null && (
            <p className="text-xs text-muted-foreground">
              {form.latitude.toFixed(5)}, {form.longitude?.toFixed(5)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Social media</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(['instagram', 'facebook', 'tiktok', 'whatsapp'] as const).map((k) => (
            <div key={k} className="space-y-2">
              <Label className="capitalize">{k}</Label>
              <Input value={form[k]} onChange={(e) => update(k, e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </div>
  );
}
