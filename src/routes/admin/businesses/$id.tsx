import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapPicker } from '@/components/merchant/MapPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/compress-image';
import { ArrowLeft, Upload, Trash2, Loader2 } from 'lucide-react';
import type { BusinessCategory, MerchantHour } from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/admin/businesses/$id')({ component: EditBusiness });

const CATEGORIES: BusinessCategory[] = ['restaurant', 'cafe', 'hotel', 'attraction', 'shop', 'activity', 'other'];
const FEATURE_OPTIONS = [
  'WiFi', 'Parking', 'Outdoor Seating', 'Family Friendly', 'Pet Friendly',
  'Wheelchair Accessible', 'Delivery', 'Takeaway', 'Reservations', 'Live Music',
  'Smoking Area', 'Card Payment', 'Kids Play Area', 'Air Conditioning', 'Power Outlets', 'Private Rooms',
];
const DIETARY_OPTIONS = ['Halal', 'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'No restrictions'];
const MOODS = ['Adventure', 'Nature', 'History & Culture', 'Luxury', 'Family', 'Photography', 'Relaxing', 'Nightlife', 'Food', 'Budget', 'Social', 'Cozy'];
const TIMES = ['morning', 'afternoon', 'evening', 'night'];
const SUITS = ['Solo', 'Couple', 'Family', 'Friends', 'Business Travelers'];
const TRANSPORT = ['walking', 'car', 'taxi', 'public'];
const PRICES = ['$', '$$', '$$$', '$$$$'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function emptyHours(): MerchantHour[] {
  return DAYS.map((_, i) => ({
    id: `tmp-${i}`, merchant_id: '', day_of_week: i,
    is_closed: false, is_24h: false, open_time: '09:00', close_time: '22:00',
  })) as MerchantHour[];
}

function MultiPick({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  function toggle(o: string) {
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button key={o} type="button" onClick={() => toggle(o)}>
            <Badge variant={active ? 'default' : 'outline'} className={cn('cursor-pointer px-3 py-1.5 text-sm capitalize', active && 'bg-primary')}>
              {o}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

function EditBusiness() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [hourRows, setHourRows] = useState<MerchantHour[]>(emptyHours());
  const [savingHours, setSavingHours] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const businessQ = useQuery({
    queryKey: ['admin-edit-business', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('merchants').select('*').eq('id', id).single();
      if (error) throw error;
      return data as any;
    },
  });

  const photosQ = useQuery({
    queryKey: ['admin-edit-photos', id],
    queryFn: async () => (await supabase.from('merchant_photos').select('*').eq('merchant_id', id).order('sort_order')).data ?? [],
  });

  const hoursQ = useQuery({
    queryKey: ['admin-edit-hours', id],
    queryFn: async () => (await supabase.from('merchant_hours').select('*').eq('merchant_id', id).order('day_of_week')).data ?? [],
  });

  useEffect(() => {
    if (businessQ.data && !form) {
      setForm({ ...businessQ.data, categories: businessQ.data.categories?.length ? businessQ.data.categories : [businessQ.data.category] });
    }
  }, [businessQ.data, form]);

  useEffect(() => {
    if (hoursQ.data) {
      const map = new Map(hoursQ.data.map((h: any) => [h.day_of_week, h]));
      setHourRows(emptyHours().map((d) => (map.get(d.day_of_week) as MerchantHour) ?? d));
    }
  }, [hoursQ.data]);

  if (!form) return <div className="text-muted-foreground">Loading…</div>;

  function update(key: string, value: unknown) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function toggleCategory(c: BusinessCategory) {
    setForm((f: any) => {
      const current: BusinessCategory[] = f.categories ?? [];
      if (current.includes(c)) {
        if (current.length === 1) return f;
        return { ...f, categories: current.filter((x: string) => x !== c) };
      }
      return { ...f, categories: [...current, c] };
    });
  }

  async function saveBasics() {
    setSaving(true);
    const { error } = await supabase.from('merchants').update({
      name: form.name, categories: form.categories, description: form.description,
      phone: form.phone, email: form.email, website: form.website,
      address: form.address, city: form.city,
      latitude: form.latitude, longitude: form.longitude,
      instagram: form.instagram, facebook: form.facebook, tiktok: form.tiktok, whatsapp: form.whatsapp,
      features: form.features, dietary_options: form.dietary_options,
      mood_tags: form.mood_tags, best_visit_time: form.best_visit_time,
      avg_duration_minutes: Number(form.avg_duration_minutes) || null,
      price_level: form.price_level, suitability: form.suitability, transportation: form.transportation,
    } as any).eq('id', id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    qc.invalidateQueries({ queryKey: ['admin-edit-business', id] });
    qc.invalidateQueries({ queryKey: ['admin-businesses'] });
  }

  async function saveHours() {
    setSavingHours(true);
    const payload = hourRows.map((r) => ({
      merchant_id: id, day_of_week: r.day_of_week, is_closed: r.is_closed, is_24h: r.is_24h,
      open_time: r.is_24h || r.is_closed ? null : r.open_time,
      close_time: r.is_24h || r.is_closed ? null : r.close_time,
    }));
    const { error } = await supabase.from('merchant_hours').upsert(payload, { onConflict: 'merchant_id,day_of_week' });
    setSavingHours(false);
    if (error) return toast.error(error.message);
    toast.success('Hours saved');
    qc.invalidateQueries({ queryKey: ['admin-edit-hours', id] });
  }

  function updateHour(i: number, patch: Partial<MerchantHour>) {
    setHourRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function uploadPhoto(kind: 'logo' | 'cover' | 'gallery', file: File) {
    setUploading(kind);
    let toUpload: Blob;
    try { toUpload = await compressImage(file, { maxSizeKB: 250, maxDimension: 1920 }); } catch { toUpload = file; }
    const path = `admin/${id}/${kind}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from('merchant-media').upload(path, toUpload, { contentType: 'image/jpeg', upsert: true });
    setUploading(null);
    if (upErr) return toast.error(upErr.message);
    const { data } = supabase.storage.from('merchant-media').getPublicUrl(path);
    if (kind === 'gallery') {
      await supabase.from('merchant_photos').insert({ merchant_id: id, url: data.publicUrl, sort_order: photosQ.data?.length ?? 0 });
      qc.invalidateQueries({ queryKey: ['admin-edit-photos', id] });
    } else {
      await supabase.from('merchants').update({ [`${kind}_url`]: data.publicUrl }).eq('id', id);
      qc.invalidateQueries({ queryKey: ['admin-edit-business', id] });
    }
    toast.success('Uploaded');
  }

  async function removeGalleryPhoto(photoId: string) {
    await supabase.from('merchant_photos').delete().eq('id', photoId);
    qc.invalidateQueries({ queryKey: ['admin-edit-photos', id] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/admin/businesses"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="font-display text-2xl font-bold">{form.name || 'Edit Business'}</h1>
            <p className="text-xs text-muted-foreground capitalize">
              {form.status} · {form.claim_status ?? 'claimed'}
            </p>
          </div>
        </div>
        <Button onClick={saveBasics} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Basic info</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Business name</Label>
            <Input value={form.name ?? ''} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Categories</Label>
            <MultiPick options={CATEGORIES} value={form.categories ?? []} onChange={(v) => setForm((f: any) => ({ ...f, categories: v }))} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city ?? ''} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['draft', 'pending', 'approved', 'rejected'].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={4} value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contact email</Label>
            <Input value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Website</Label>
            <Input value={form.website ?? ''} onChange={(e) => update('website', e.target.value)} />
          </div>
          {(['instagram', 'facebook', 'tiktok', 'whatsapp'] as const).map((k) => (
            <div key={k} className="space-y-2">
              <Label className="capitalize">{k}</Label>
              <Input value={form[k] ?? ''} onChange={(e) => update(k, e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address ?? ''} onChange={(e) => update('address', e.target.value)} />
          </div>
          <MapPicker
            lat={form.latitude}
            lng={form.longitude}
            onChange={(lat, lng) => setForm((f: any) => ({ ...f, latitude: lat, longitude: lng }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Features &amp; dietary options</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block">Features</Label>
            <MultiPick options={FEATURE_OPTIONS} value={form.features ?? []} onChange={(v) => update('features', v)} />
          </div>
          <div>
            <Label className="mb-2 block">Dietary options</Label>
            <MultiPick options={DIETARY_OPTIONS} value={form.dietary_options ?? []} onChange={(v) => update('dietary_options', v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AI Planning</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div><Label className="mb-2 block">Mood tags</Label><MultiPick options={MOODS} value={form.mood_tags ?? []} onChange={(v) => update('mood_tags', v)} /></div>
          <div><Label className="mb-2 block">Best visit time</Label><MultiPick options={TIMES} value={form.best_visit_time ?? []} onChange={(v) => update('best_visit_time', v)} /></div>
          <div><Label className="mb-2 block">Suitable for</Label><MultiPick options={SUITS} value={form.suitability ?? []} onChange={(v) => update('suitability', v)} /></div>
          <div><Label className="mb-2 block">Transportation</Label><MultiPick options={TRANSPORT} value={form.transportation ?? []} onChange={(v) => update('transportation', v)} /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Average duration (minutes)</Label>
              <Input type="number" min={5} value={form.avg_duration_minutes ?? ''} onChange={(e) => update('avg_duration_minutes', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price level</Label>
              <Select value={form.price_level ?? ''} onValueChange={(v) => update('price_level', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{PRICES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Logo</Label>
              {form.logo_url && <img src={form.logo_url} className="h-20 w-20 rounded object-cover" alt="logo" />}
              <UploadButton busy={uploading === 'logo'} onPick={(f) => uploadPhoto('logo', f)} />
            </div>
            <div className="space-y-2">
              <Label>Cover image</Label>
              {form.cover_url && <img src={form.cover_url} className="h-24 w-full rounded object-cover" alt="cover" />}
              <UploadButton busy={uploading === 'cover'} onPick={(f) => uploadPhoto('cover', f)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gallery</Label>
            <UploadButton busy={uploading === 'gallery'} onPick={(f) => uploadPhoto('gallery', f)} />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photosQ.data?.map((p: any) => (
                <div key={p.id} className="group relative">
                  <img src={p.url} className="aspect-square w-full rounded object-cover" alt="" />
                  <button onClick={() => removeGalleryPhoto(p.id)} className="absolute right-1 top-1 rounded bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Opening hours</CardTitle>
          <Button size="sm" onClick={saveHours} disabled={savingHours}>{savingHours ? 'Saving…' : 'Save hours'}</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {hourRows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 items-center gap-3 rounded border p-3 md:grid-cols-[110px_1fr_1fr_auto_auto]">
              <div className="font-medium text-sm">{DAYS[row.day_of_week]}</div>
              <Input type="time" value={row.open_time ?? '09:00'} disabled={row.is_closed || row.is_24h} onChange={(e) => updateHour(i, { open_time: e.target.value })} />
              <Input type="time" value={row.close_time ?? '22:00'} disabled={row.is_closed || row.is_24h} onChange={(e) => updateHour(i, { close_time: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={row.is_24h} onCheckedChange={(v) => updateHour(i, { is_24h: v, is_closed: false })} /> 24h
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={row.is_closed} onCheckedChange={(v) => updateHour(i, { is_closed: v, is_24h: false })} /> Closed
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end pb-10">
        <Button onClick={saveBasics} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </div>
  );
}

function UploadButton({ busy, onPick }: { busy: boolean; onPick: (f: File) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-accent">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      {busy ? 'Uploading…' : 'Upload'}
      <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onPick(f);
        e.target.value = '';
      }} />
    </label>
  );
}
