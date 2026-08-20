import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { ensureMerchant, useMyMerchant } from '@/components/merchant/use-my-merchant';
import { useMerchantContext } from '@/components/merchant/merchant-context';
import { MapPicker } from '@/components/merchant/MapPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { compressImage } from '@/lib/compress-image';
import {
  Link2, Link2Off, Plus, Upload, Trash2, CheckCircle2, AlertCircle, Rocket, Circle,
} from 'lucide-react';
import type {
  BusinessCategory, PriceLevel, MerchantHour, MerchantPhoto,
} from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/merchant/_authenticated/my-business')({
  component: MyBusiness,
});

const CATEGORIES: BusinessCategory[] = ['restaurant', 'cafe', 'hotel', 'attraction', 'shop', 'activity', 'other'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MOODS = ['Adventure', 'Nature', 'History & Culture', 'Luxury', 'Family', 'Photography', 'Relaxing', 'Nightlife', 'Food', 'Budget', 'Social', 'Cozy'];
const TIMES = ['morning', 'afternoon', 'evening', 'night'];
const SUITS = ['Solo', 'Couple', 'Family', 'Friends', 'Business Travelers'];
const TRANSPORT = ['walking', 'car', 'taxi', 'public'];
const PRICES: PriceLevel[] = ['$', '$$', '$$$', '$$$$'];
const FEATURE_OPTIONS = [
  'WiFi', 'Parking', 'Outdoor Seating', 'Family Friendly', 'Pet Friendly',
  'Wheelchair Accessible', 'Delivery', 'Takeaway', 'Reservations', 'Live Music',
  'Smoking Area', 'Card Payment', 'Kids Play Area',
  'Air Conditioning', 'Power Outlets', 'Private Rooms',
];
const DIETARY_OPTIONS = ['Halal', 'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'No restrictions'];

const NAV_SECTIONS = [
  { id: 'section-basic', label: 'Basic Info' },
  { id: 'section-location', label: 'Location' },
  { id: 'section-social', label: 'Social' },
  { id: 'section-photos', label: 'Photos' },
  { id: 'section-hours', label: 'Hours' },
  { id: 'section-features', label: 'Features' },
  { id: 'section-ai-planning', label: 'AI Planning' },
  { id: 'section-branches', label: 'Branches' },
];

function emptyHours(): MerchantHour[] {
  return DAYS.map((_, i) => ({
    id: `tmp-${i}`, merchant_id: '', day_of_week: i,
    is_closed: false, is_24h: false, open_time: '09:00', close_time: '22:00',
  }));
}

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Small red helper line shown under a field only after the merchant has
// tried to submit and that specific field is still missing. Keeps the page
// silent and un-intimidating until they actually try to move forward.
function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" /> {message}
    </p>
  );
}

function MultiPick({ label, options, value, onChange, error }: {
  label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; error?: string;
}) {
  function toggle(o: string) {
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <button key={o} type="button" onClick={() => toggle(o)}>
              <Badge variant={active ? 'default' : 'outline'} className={cn('cursor-pointer capitalize', active && 'bg-primary')}>
                {o}
              </Badge>
            </button>
          );
        })}
      </div>
      {error && <FieldError show message={error} />}
    </div>
  );
}

function MyBusiness() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: m, isLoading } = useMyMerchant(user?.id);
  const { merchants, branchSiblings, linkAsBranch, unlinkBranch, createBusiness, setCurrentMerchantId } = useMerchantContext();

  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const [linkTargetId, setLinkTargetId] = useState('');
  const [branchLabel, setBranchLabel] = useState('');
  const [linking, setLinking] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLabel, setNewBranchLabel] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);

  const [hourRows, setHourRows] = useState<MerchantHour[]>(emptyHours());

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
    setHourRows(emptyHours().map((d) => map.get(d.day_of_week) ?? d));
  }, [hoursQ.data]);

  const photosQ = useQuery({
    queryKey: ['merchant-photos', m?.id],
    enabled: !!m?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_photos').select('*').eq('merchant_id', m!.id).order('sort_order');
      if (error) throw error;
      return (data ?? []) as MerchantPhoto[];
    },
  });

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

  function updateHour(i: number, patch: Partial<MerchantHour>) {
    setHourRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  // One button, one save: writes every editable merchants-table field plus
  // the weekly hours in a single pass, so nothing gets left half-saved
  // across what used to be five separate pages.
  async function saveAll() {
    setSaving(true);
    const hoursPayload = hourRows.map((r) => ({
      merchant_id: form.id,
      day_of_week: r.day_of_week,
      is_closed: r.is_closed,
      is_24h: r.is_24h,
      open_time: r.is_24h || r.is_closed ? null : r.open_time,
      close_time: r.is_24h || r.is_closed ? null : r.close_time,
    }));

    const [merchantRes, hoursRes] = await Promise.all([
      supabase.from('merchants').update({
        name: form.name, categories: form.categories, description: form.description,
        phone: form.phone, email: form.email, website: form.website,
        address: form.address, city: form.city,
        latitude: form.latitude, longitude: form.longitude,
        instagram: form.instagram, facebook: form.facebook,
        tiktok: form.tiktok, whatsapp: form.whatsapp,
        features: form.features, dietary_options: form.dietary_options,
        mood_tags: form.mood_tags, best_visit_time: form.best_visit_time,
        avg_duration_minutes: Number(form.avg_duration_minutes) || 60,
        price_level: form.price_level, suitability: form.suitability,
        transportation: form.transportation,
      } as any).eq('id', form.id),
      supabase.from('merchant_hours').upsert(hoursPayload, { onConflict: 'merchant_id,day_of_week' }),
    ]);

    setSaving(false);
    if (merchantRes.error) return toast.error(merchantRes.error.message);
    if (hoursRes.error) return toast.error(hoursRes.error.message);
    toast.success('All changes saved');
    qc.invalidateQueries({ queryKey: ['my-merchant', user?.id] });
    qc.invalidateQueries({ queryKey: ['merchant-hours', form.id] });
  }

  // ---- Photos ----
  function extractStoragePath(url: string | null | undefined): string | null {
    if (!url) return null;
    const marker = '/storage/v1/object/public/merchant-media/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  }

  async function uploadPhoto(kind: 'logo' | 'cover' | 'gallery', file: File) {
    const previousUrl = kind === 'logo' ? m!.logo_url : kind === 'cover' ? m!.cover_url : null;
    let toUpload: Blob;
    try {
      toUpload = await compressImage(file, { maxSizeKB: 250, maxDimension: 1920 });
    } catch {
      toUpload = file;
    }
    const path = `${user!.id}/${m!.id}/${kind}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from('merchant-media').upload(path, toUpload, {
      contentType: 'image/jpeg', upsert: true,
    });
    if (upErr) return toast.error(upErr.message);
    const { data } = supabase.storage.from('merchant-media').getPublicUrl(path);
    const url = data.publicUrl;
    if (kind === 'gallery') {
      await supabase.from('merchant_photos').insert({ merchant_id: m!.id, url, sort_order: photosQ.data?.length ?? 0 });
      qc.invalidateQueries({ queryKey: ['merchant-photos', m!.id] });
    } else {
      await supabase.from('merchants').update({ [`${kind}_url`]: url }).eq('id', m!.id);
      qc.invalidateQueries({ queryKey: ['my-merchant', user!.id] });
      const oldPath = extractStoragePath(previousUrl);
      if (oldPath) await supabase.storage.from('merchant-media').remove([oldPath]);
    }
    toast.success('Uploaded');
  }

  async function removePhoto(photo: MerchantPhoto) {
    await supabase.from('merchant_photos').delete().eq('id', photo.id);
    const path = extractStoragePath(photo.url);
    if (path) await supabase.storage.from('merchant-media').remove([path]);
    qc.invalidateQueries({ queryKey: ['merchant-photos', m!.id] });
  }

  // ---- Branches ----
  const linkCandidates = merchants.filter(
    (x) => x.id !== form.id && (x as any).brand_group_id !== (form as any).brand_group_id,
  );

  async function handleLink() {
    if (!linkTargetId) return;
    setLinking(true);
    try {
      await linkAsBranch(form.id, linkTargetId, branchLabel || undefined);
      toast.success('Linked as a branch');
      setLinkTargetId('');
      setBranchLabel('');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not link');
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(branchId: string) {
    try {
      await unlinkBranch(branchId);
      toast.success('Unlinked');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not unlink');
    }
  }

  async function handleCreateBranch() {
    if (!newBranchName.trim()) return toast.error('Enter a name for the new branch');
    setCreatingBranch(true);
    try {
      const created = await createBusiness(newBranchName.trim(), form);
      setCurrentMerchantId(form.id);
      await linkAsBranch(form.id, created.id, newBranchLabel || undefined);
      toast.success('New branch created with your business details copied over — set its location and submit for review.');
      setNewBranchName('');
      setNewBranchLabel('');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not create branch');
    } finally {
      setCreatingBranch(false);
    }
  }

  // ---- Readiness (drives the progress pill, the nav dots, inline field
  // errors, and the Submit action at the bottom — one source of truth) ----
  const checks = [
    { id: 'name', ok: !!form.name, label: 'Business name', section: 'section-basic' },
    { id: 'description', ok: !!form.description, label: 'Description', section: 'section-basic' },
    { id: 'location', ok: form.latitude != null && form.longitude != null, label: 'Location pinned on the map', section: 'section-location' },
    { id: 'logo', ok: !!m.logo_url, label: 'Logo', section: 'section-photos' },
    { id: 'cover', ok: !!m.cover_url, label: 'Cover image', section: 'section-photos' },
    { id: 'features', ok: (form.features ?? []).length > 0, label: 'At least one feature', section: 'section-features' },
    { id: 'mood_tags', ok: (form.mood_tags ?? []).length > 0, label: 'At least one AI planning mood tag', section: 'section-ai-planning' },
  ];
  const readyCount = checks.filter((c) => c.ok).length;
  const ready = readyCount === checks.length;

  function invalid(id: string) {
    return attemptedSubmit && !checks.find((c) => c.id === id)?.ok;
  }

  const sectionComplete = (sectionId: string) => {
    const relevant = checks.filter((c) => c.section === sectionId);
    return relevant.length === 0 || relevant.every((c) => c.ok);
  };

  async function handleSubmitForReview() {
    if (!ready) {
      setAttemptedSubmit(true);
      toast.error('A few things need your attention — highlighted below.');
      const firstMissing = checks.find((c) => !c.ok);
      if (firstMissing) requestAnimationFrame(() => jumpTo(firstMissing.section));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('merchants')
      .update({ status: 'pending', submitted_at: new Date().toISOString(), rejection_reason: null })
      .eq('id', form.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Submitted for review!');
    qc.invalidateQueries({ queryKey: ['my-merchant', user?.id] });
    navigate({ to: '/merchant/dashboard' });
  }

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* Sticky header: title, always-on Save, and a quiet progress pill —
          no gating, just a running total that only matters once they open
          the Submit section at the bottom. */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 space-y-3 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">My Business</h2>
            <p className="text-sm text-muted-foreground">Everything about your listing, in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{readyCount}/{checks.length} ready for review</span>
            <Button onClick={saveAll} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jumpTo(s.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-gold/50 hover:text-foreground"
            >
              {sectionComplete(s.id)
                ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                : <Circle className="h-3 w-3" />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <Card id="section-basic">
          <CardHeader><CardTitle>Basic info</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Business name</Label>
              <Input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className={cn(invalid('name') && 'border-destructive focus-visible:ring-destructive')}
              />
              <FieldError show={invalid('name')} message="Give your business a name so customers can find it." />
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
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className={cn(invalid('description') && 'border-destructive focus-visible:ring-destructive')}
              />
              <FieldError show={invalid('description')} message="Add a short description — a sentence or two is enough." />
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

        <Card id="section-location">
          <CardHeader><CardTitle>Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Click on the map or drag the pin to set the exact location.</p>
            <div className={cn('overflow-hidden rounded-lg', invalid('location') && 'ring-2 ring-destructive')}>
              <MapPicker
                lat={form.latitude}
                lng={form.longitude}
                onChange={(lat, lng) => setForm((f: any) => ({ ...f, latitude: lat, longitude: lng }))}
              />
            </div>
            {form.latitude != null && (
              <p className="text-xs text-muted-foreground">
                {form.latitude.toFixed(5)}, {form.longitude?.toFixed(5)}
              </p>
            )}
            <FieldError show={invalid('location')} message="Pin your business on the map so travelers can find it." />
          </CardContent>
        </Card>

        <Card id="section-social">
          <CardHeader>
            <CardTitle>Social media</CardTitle>
            <p className="text-sm text-muted-foreground">Optional — add whichever ones you use.</p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {(['instagram', 'facebook', 'tiktok', 'whatsapp'] as const).map((k) => (
              <div key={k} className="space-y-2">
                <Label className="capitalize">{k}</Label>
                <Input value={form[k]} onChange={(e) => update(k, e.target.value)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card id="section-photos">
          <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className={cn('space-y-3 rounded-lg', invalid('logo') && 'ring-2 ring-destructive p-3')}>
                <Label>Logo</Label>
                {m.logo_url && <img src={m.logo_url} alt="logo" className="h-24 w-24 rounded object-cover" />}
                <UploadInput label="Upload logo" onPick={(f) => { void uploadPhoto('logo', f); }} />
                <FieldError show={invalid('logo')} message="Add a logo so customers recognize you." />
              </div>
              <div className={cn('space-y-3 rounded-lg', invalid('cover') && 'ring-2 ring-destructive p-3')}>
                <Label>Cover image</Label>
                {m.cover_url && <img src={m.cover_url} alt="cover" className="h-32 w-full rounded object-cover" />}
                <UploadInput label="Upload cover" onPick={(f) => { void uploadPhoto('cover', f); }} />
                <FieldError show={invalid('cover')} message="Add a cover photo for your listing's header." />
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <Label>Gallery</Label>
              <UploadInput label="Add photo" onPick={(f) => { void uploadPhoto('gallery', f); }} />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {photosQ.data?.map((p) => (
                  <div key={p.id} className="group relative">
                    <img src={p.url} alt={p.caption} className="aspect-square w-full rounded object-cover" />
                    <button
                      onClick={() => removePhoto(p)}
                      className="absolute right-1 top-1 rounded bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="section-hours">
          <CardHeader><CardTitle>Opening hours</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {hourRows.map((row, i) => (
              <div key={i} className="grid grid-cols-1 items-center gap-3 rounded border p-3 md:grid-cols-[110px_1fr_1fr_auto_auto]">
                <div className="font-medium">{DAYS[row.day_of_week]}</div>
                <Input
                  type="time" value={row.open_time ?? '09:00'}
                  disabled={row.is_closed || row.is_24h}
                  onChange={(e) => updateHour(i, { open_time: e.target.value })}
                />
                <Input
                  type="time" value={row.close_time ?? '22:00'}
                  disabled={row.is_closed || row.is_24h}
                  onChange={(e) => updateHour(i, { close_time: e.target.value })}
                />
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={row.is_24h} onCheckedChange={(v) => updateHour(i, { is_24h: v, is_closed: false })} />
                  24h
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={row.is_closed} onCheckedChange={(v) => updateHour(i, { is_closed: v, is_24h: false })} />
                  Closed
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card id="section-features">
          <CardHeader><CardTitle>Features & tags</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select all that apply</Label>
              <div className="flex flex-wrap gap-2">
                {FEATURE_OPTIONS.map((f) => {
                  const active = (form.features ?? []).includes(f);
                  return (
                    <button key={f} type="button" onClick={() => setForm((s: any) => ({
                      ...s,
                      features: active ? s.features.filter((x: string) => x !== f) : [...(s.features ?? []), f],
                    }))}>
                      <Badge variant={active ? 'default' : 'outline'} className={cn('cursor-pointer px-3 py-1.5 text-sm', active && 'bg-primary')}>
                        {f}
                      </Badge>
                    </button>
                  );
                })}
              </div>
              <FieldError show={invalid('features')} message="Pick at least one feature travelers might care about." />
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label>Dietary options</Label>
              <p className="text-xs text-muted-foreground">Optional — so travelers with specific dietary needs can find you.</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((d) => {
                  const active = (form.dietary_options ?? []).includes(d);
                  return (
                    <button key={d} type="button" onClick={() => setForm((s: any) => ({
                      ...s,
                      dietary_options: active ? s.dietary_options.filter((x: string) => x !== d) : [...(s.dietary_options ?? []), d],
                    }))}>
                      <Badge variant={active ? 'default' : 'outline'} className={cn('cursor-pointer px-3 py-1.5 text-sm', active && 'bg-primary')}>
                        {d}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="section-ai-planning">
          <CardHeader>
            <CardTitle>AI planning info</CardTitle>
            <p className="text-sm text-muted-foreground">Helps ErbilGo recommend your place to the right travelers.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <MultiPick
              label="Mood tags" options={MOODS} value={form.mood_tags ?? []}
              onChange={(v) => update('mood_tags', v)}
              error={invalid('mood_tags') ? 'Pick at least one mood tag so the AI planner can match you to travelers.' : undefined}
            />
            <MultiPick label="Best visit time" options={TIMES} value={form.best_visit_time ?? []} onChange={(v) => update('best_visit_time', v)} />
            <MultiPick label="Suitable for" options={SUITS} value={form.suitability ?? []} onChange={(v) => update('suitability', v)} />
            <MultiPick label="Transportation" options={TRANSPORT} value={form.transportation ?? []} onChange={(v) => update('transportation', v)} />

            <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Average duration (minutes)</Label>
                <Input type="number" min={5} value={form.avg_duration_minutes ?? 60}
                  onChange={(e) => update('avg_duration_minutes', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Price level</Label>
                <Select value={form.price_level ?? '$$'} onValueChange={(v) => update('price_level', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="section-branches">
          <CardHeader>
            <CardTitle>Branches</CardTitle>
            <p className="text-sm text-muted-foreground">
              Link another business you own as a branch of this one — they'll show together on the public page with a branch switcher.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {branchSiblings.length > 0 ? (
              <div className="space-y-2">
                {(form as any).is_main_branch && (
                  <p className="text-xs font-medium text-gold">This is the main branch for its group.</p>
                )}
                {branchSiblings.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{s.name || '(untitled)'}</p>
                      <p className="text-xs text-muted-foreground">
                        {(s as any).branch_label || 'No label'} {(s as any).is_main_branch && '· Main branch'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setCurrentMerchantId(s.id)}>
                        Manage this branch
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleUnlink(s.id)}>
                        <Link2Off className="mr-1.5 h-3.5 w-3.5" /> Unlink
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not linked to any other business yet.</p>
            )}

            {linkCandidates.length > 0 && (
              <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="min-w-[200px] flex-1 space-y-2">
                  <Label>Link a business you already own</Label>
                  <Select value={linkTargetId} onValueChange={setLinkTargetId}>
                    <SelectTrigger><SelectValue placeholder="Choose a business…" /></SelectTrigger>
                    <SelectContent>
                      {linkCandidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name || '(untitled)'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[160px] space-y-2">
                  <Label>Branch label</Label>
                  <Input placeholder="e.g. Ankawa branch" value={branchLabel} onChange={(e) => setBranchLabel(e.target.value)} />
                </div>
                <Button onClick={handleLink} disabled={!linkTargetId || linking}>
                  <Link2 className="mr-1.5 h-3.5 w-3.5" /> {linking ? 'Linking…' : 'Link'}
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label>Or create a brand-new branch</Label>
                <Input placeholder="New branch name" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} />
              </div>
              <div className="min-w-[160px] space-y-2">
                <Label>Branch label</Label>
                <Input placeholder="e.g. Ankawa branch" value={newBranchLabel} onChange={(e) => setNewBranchLabel(e.target.value)} />
              </div>
              <Button variant="outline" onClick={handleCreateBranch} disabled={!newBranchName.trim() || creatingBranch}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> {creatingBranch ? 'Creating…' : 'Create & link'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can also use "Add another business" in the sidebar switcher first, then link it here.
            </p>
          </CardContent>
        </Card>

        <Card id="section-submit" className="border-gold/30">
          <CardHeader><CardTitle>Submit for review</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {m.status === 'approved' && (
              <Alert className="border-green-600/30 bg-green-600/5">
                <Rocket className="h-4 w-4 text-green-600" />
                <AlertTitle>Your listing is live</AlertTitle>
                <AlertDescription>Editing your business details, photos, hours, or tags will automatically send it back for review.</AlertDescription>
              </Alert>
            )}
            {m.status === 'pending' && (
              <Alert>
                <AlertTitle>Already pending</AlertTitle>
                <AlertDescription>Your listing is awaiting admin approval.</AlertDescription>
              </Alert>
            )}
            {m.status === 'rejected' && (
              <Alert variant="destructive">
                <AlertTitle>Previously rejected</AlertTitle>
                <AlertDescription>{m.rejection_reason || 'No reason provided. Update your listing and resubmit.'}</AlertDescription>
              </Alert>
            )}

            {m.status !== 'approved' && (
              <>
                <div className="space-y-2">
                  {checks.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => jumpTo(c.section)}
                      className="flex w-full items-center gap-2 text-left text-sm hover:underline"
                    >
                      {c.ok
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                        : <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span className={c.ok ? '' : 'text-muted-foreground'}>{c.label}</span>
                    </button>
                  ))}
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={submitting || m.status === 'pending'}
                  onClick={handleSubmitForReview}
                >
                  {submitting ? 'Submitting…' : m.status === 'pending' ? 'Already submitted' : 'Submit for review'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {ready ? "You're all set — this goes straight to an admin." : "You can submit any time — we'll point out anything still missing."}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UploadInput({ label, onPick }: { label: string; onPick: (f: File) => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-accent">
      <Upload className="h-4 w-4" />
      {busy ? 'Uploading…' : label}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          await onPick(f);
          setBusy(false);
          e.target.value = '';
        }}
      />
    </Label>
  );
}
