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
import { ImageCropDialog } from '@/components/merchant/ImageCropDialog';
import {
  Link2, Link2Off, Plus, Upload, Trash2, CheckCircle2, AlertCircle, Rocket, Circle, ImageOff, ShieldCheck,
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
  const [activeStep, setActiveStep] = useState(0);

  const [linkTargetId, setLinkTargetId] = useState('');
  const [branchLabel, setBranchLabel] = useState('');
  const [linking, setLinking] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLabel, setNewBranchLabel] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);

  const [hourRows, setHourRows] = useState<MerchantHour[]>(emptyHours());
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Set<string>>(new Set());
  const [cropTarget, setCropTarget] = useState<{ kind: 'logo' | 'cover'; src: string } | null>(null);

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
    if (m && !form) {
      setForm({ ...m, categories: (m as any).categories?.length ? (m as any).categories : [m.category] });
    }
  }, [m, form]);

  // If no business exists, redirect back to the Gateway Dashboard
  useEffect(() => {
    if (!isLoading && !m) {
      navigate({ to: '/merchant/dashboard', replace: true });
    }
  }, [isLoading, m, navigate]);

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  if (!m) {
    return <div className="text-muted-foreground">Redirecting to setup…</div>;
  }

  if (!form) return <div className="text-muted-foreground">Loading form…</div>;

  function update<K extends string>(key: K, value: unknown) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function toggleCategory(c: BusinessCategory) {
    setForm((f: any) => {
      const current: BusinessCategory[] = f.categories ?? [];
      if (current.includes(c)) {
        if (current.length === 1) return f; 
        return { ...f, categories: current.filter((x) => x !== c) };
      }
      return { ...f, categories: [...current, c] };
    });
  }

  function updateHour(i: number, patch: Partial<MerchantHour>) {
    setHourRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

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
    qc.invalidateQueries({ queryKey: ['my-merchants', user?.id] });
    qc.invalidateQueries({ queryKey: ['merchant-hours', form.id] });
  }

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
      qc.invalidateQueries({ queryKey: ['my-merchants', user!.id] });
      const oldPath = extractStoragePath(previousUrl);
      if (oldPath) await supabase.storage.from('merchant-media').remove([oldPath]);
    }
    toast.success('Uploaded');
  }

  function pickForCrop(kind: 'logo' | 'cover', file: File) {
    const src = URL.createObjectURL(file);
    setCropTarget({ kind, src });
  }

  function cancelCrop() {
    if (cropTarget) URL.revokeObjectURL(cropTarget.src);
    setCropTarget(null);
  }

  async function confirmCrop(blob: Blob) {
    if (!cropTarget) return;
    const { kind, src } = cropTarget;
    URL.revokeObjectURL(src);
    setCropTarget(null);
    const croppedFile = new File([blob], `${kind}.jpg`, { type: 'image/jpeg' });
    await uploadPhoto(kind, croppedFile);
  }

  async function removePhoto(photo: MerchantPhoto) {
    await supabase.from('merchant_photos').delete().eq('id', photo.id);
    const path = extractStoragePath(photo.url);
    if (path) await supabase.storage.from('merchant-media').remove([path]);
    qc.invalidateQueries({ queryKey: ['merchant-photos', m!.id] });
  }

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
      toast.success('New branch created with your business details copied over — set its location and hours below.');
      setNewBranchName('');
      setNewBranchLabel('');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not create branch');
    } finally {
      setCreatingBranch(false);
    }
  }

  const checks = [
    { id: 'name', label: 'Business name', ok: !!form.name?.trim(), section: 'section-basic' },
    { id: 'cat', label: 'Category', ok: !!form.categories?.length, section: 'section-basic' },
    { id: 'loc', label: 'Map location', ok: form.latitude != null && form.longitude != null, section: 'section-location' },
    { id: 'phone', label: 'Phone number', ok: !!form.phone?.trim(), section: 'section-basic' },
    { id: 'logo', label: 'Logo', ok: !!m?.logo_url, section: 'section-photos' },
    { id: 'cover', label: 'Cover image', ok: !!m?.cover_url, section: 'section-photos' },
  ];
  const ready = checks.every((c) => c.ok);

  function goNext() {
    if (activeStep === 0 && (!form.name?.trim() || !form.phone?.trim() || !form.categories?.length)) {
      setAttemptedSubmit(true);
      toast.error('Complete the business basics before continuing.');
      return;
    }
    if (activeStep === 1 && (form.latitude == null || form.longitude == null)) {
      setAttemptedSubmit(true);
      toast.error('Select the business location on the map before continuing.');
      return;
    }
    setAttemptedSubmit(false);
    setActiveStep((step) => Math.min(step + 1, NAV_SECTIONS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setAttemptedSubmit(false);
    setActiveStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmitForReview() {
    if (!ready) {
      setAttemptedSubmit(true);
      toast.error('Please complete all required fields before submitting.');
      const firstMissing = checks.find((c) => !c.ok);
      if (firstMissing) jumpTo(firstMissing.section);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('merchants').update({ status: 'pending' }).eq('id', form.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Submitted for review!');
    qc.invalidateQueries({ queryKey: ['my-merchants', user?.id] });
  }

  return (
    <div className="mx-auto max-w-4xl pb-20">
      <div className="mb-8 rounded-2xl border border-gold/20 bg-card/60 p-4 shadow-luxury">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold">Business setup</p>
            <h1 className="mt-1 font-display text-2xl font-bold">Build your listing, one step at a time</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your progress stays on this page. You can save a draft at any time.</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-gold">{activeStep + 1} / {NAV_SECTIONS.length}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
          {NAV_SECTIONS.map((section, index) => (
            <button
              key={section.id}
              type="button"
              onClick={() => { setAttemptedSubmit(false); setActiveStep(index); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="group text-left"
              aria-current={activeStep === index ? 'step' : undefined}
            >
              <div className={cn('h-1.5 rounded-full transition-colors', activeStep >= index ? 'bg-gold' : 'bg-border group-hover:bg-gold/50')} />
              <span className={cn('mt-1 block truncate text-[9px] font-semibold uppercase tracking-wider', activeStep === index ? 'text-gold' : 'text-muted-foreground')}>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {activeStep === 0 && <Card id="section-basic">
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Business name</Label>
                <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Citadel View Restaurant" />
                <FieldError show={attemptedSubmit && !form.name?.trim()} message="Name is required" />
              </div>
              <div className="space-y-2">
                <Label>Primary Phone</Label>
                <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+964 …" />
                <FieldError show={attemptedSubmit && !form.phone?.trim()} message="Phone is required" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categories (Select all that apply)</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const active = (form.categories ?? []).includes(c);
                  return (
                    <button key={c} type="button" onClick={() => toggleCategory(c)}>
                      <Badge variant={active ? 'default' : 'outline'} className={cn('cursor-pointer capitalize', active && 'bg-primary')}>
                        {c}
                      </Badge>
                    </button>
                  );
                })}
              </div>
              <FieldError show={attemptedSubmit && !form.categories?.length} message="Select at least one category" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Tell travelers what makes your place special…" rows={4} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Email (Public)</Label>
                <Input value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="hello@business.com" />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://…" />
              </div>
            </div>
          </CardContent>
        </Card>}

        {activeStep === 1 && <Card id="section-location">
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <p className="text-sm text-muted-foreground">Drag the pin to your exact location on the map.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="e.g. 100m Road, near Citadel" />
              </div>
              <div className="space-y-2">
                <Label>City / District</Label>
                <Input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Ankawa, Erbil" />
              </div>
            </div>
            <div className="h-[400px] overflow-hidden rounded-xl border">
              <MapPicker
                lat={form.latitude}
                lng={form.longitude}
                onChange={(lat, lng) => {
                  update('latitude', lat);
                  update('longitude', lng);
                }}
              />
            </div>
            <FieldError show={attemptedSubmit && (form.latitude == null || form.longitude == null)} message="Please select your location on the map" />
          </CardContent>
        </Card>}

        {activeStep === 2 && <Card id="section-social">
          <CardHeader><CardTitle>Social Media</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Instagram Username</Label>
              <Input value={form.instagram} onChange={(e) => update('instagram', e.target.value)} placeholder="@username" />
            </div>
            <div className="space-y-2">
              <Label>Facebook Page URL</Label>
              <Input value={form.facebook} onChange={(e) => update('facebook', e.target.value)} placeholder="https://facebook.com/…" />
            </div>
            <div className="space-y-2">
              <Label>Tiktok</Label>
              <Input value={form.tiktok} onChange={(e) => update('tiktok', e.target.value)} placeholder="@username" />
            </div>
            <div className="space-y-2">
              <Label>Whatsapp</Label>
              <Input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="+964 …" />
            </div>
          </CardContent>
        </Card>}

        {activeStep === 3 && <Card id="section-photos">
          <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-base">Logo</Label>
                <div className="relative aspect-square w-32 overflow-hidden rounded-xl border bg-muted">
                  {m?.logo_url ? (
                    <img src={m.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><ImageOff className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                </div>
                <UploadInput label="Upload logo" onPick={(f) => pickForCrop('logo', f)} />
                <FieldError show={attemptedSubmit && !m?.logo_url} message="Logo is required" />
              </div>
              <div className="space-y-3">
                <Label className="text-base">Cover image</Label>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                  {m?.cover_url ? (
                    <img src={m.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><ImageOff className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                </div>
                <UploadInput label="Upload cover" onPick={(f) => pickForCrop('cover', f)} />
                <FieldError show={attemptedSubmit && !m?.cover_url} message="Cover image is required" />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base">Gallery</Label>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {photosQ.data?.map((p) => {
                  const isBroken = brokenPhotoIds.has(p.id);
                  return (
                    <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                      {isBroken ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-[10px] text-muted-foreground">
                          <ImageOff className="h-4 w-4" /> Photo missing
                        </div>
                      ) : (
                        <img
                          src={p.url}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={() => setBrokenPhotoIds((s) => new Set(s).add(p.id))}
                        />
                      )}
                      <button
                        onClick={() => removePhoto(p)}
                        className="absolute right-1 top-1 rounded-md bg-destructive p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-primary/50 hover:bg-accent">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Add photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto('gallery', e.target.files[0])} />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>}

        {activeStep === 4 && <Card id="section-hours">
          <CardHeader><CardTitle>Opening hours</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {hourRows.map((h, i) => (
              <div key={h.day_of_week} className="flex flex-wrap items-center gap-4 border-b border-border/40 pb-4 last:border-0 last:pb-0">
                <div className="w-24 font-medium">{DAYS[h.day_of_week]}</div>
                <div className="flex flex-1 items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="w-32"
                      disabled={h.is_closed || h.is_24h}
                      value={h.open_time || '09:00'}
                      onChange={(e) => updateHour(i, { open_time: e.target.value })}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      className="w-32"
                      disabled={h.is_closed || h.is_24h}
                      value={h.close_time || '22:00'}
                      onChange={(e) => updateHour(i, { close_time: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={h.is_24h} onCheckedChange={(v) => updateHour(i, { is_24h: v, is_closed: false })} />
                      24h
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={h.is_closed} onCheckedChange={(v) => updateHour(i, { is_closed: v, is_24h: false })} />
                      Closed
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>}

        {activeStep === 5 && <Card id="section-features">
          <CardHeader><CardTitle>Features &amp; Dietary</CardTitle></CardHeader>
          <CardContent className="space-y-8">
            <MultiPick label="Amenities & Features" options={FEATURE_OPTIONS} value={form.features || []} onChange={(v) => update('features', v)} />
            <MultiPick label="Dietary Options" options={DIETARY_OPTIONS} value={form.dietary_options || []} onChange={(v) => update('dietary_options', v)} />
          </CardContent>
        </Card>}

        {activeStep === 6 && <Card id="section-ai-planning">
          <CardHeader>
            <CardTitle>AI Planning Info</CardTitle>
            <p className="text-sm text-muted-foreground">This information helps our AI recommend your business to the right travelers.</p>
          </CardHeader>
          <CardContent className="space-y-8">
            <MultiPick label="Best Moods/Vibes" options={MOODS} value={form.mood_tags || []} onChange={(v) => update('mood_tags', v)} />
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Best time to visit</Label>
                <Select value={form.best_visit_time} onValueChange={(v) => update('best_visit_time', v)}>
                  <SelectTrigger><SelectValue placeholder="Select time…" /></SelectTrigger>
                  <SelectContent>{TIMES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price Level</Label>
                <Select value={form.price_level} onValueChange={(v) => update('price_level', v)}>
                  <SelectTrigger><SelectValue placeholder="Select level…" /></SelectTrigger>
                  <SelectContent>{PRICES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <MultiPick label="Suitable for" options={SUITS} value={form.suitability || []} onChange={(v) => update('suitability', v)} />
            <MultiPick label="Best transportation" options={TRANSPORT} value={form.transportation || []} onChange={(v) => update('transportation', v)} />

            <div className="space-y-2">
              <Label>Average visit duration (minutes)</Label>
              <Input type="number" value={form.avg_duration_minutes} onChange={(e) => update('avg_duration_minutes', e.target.value)} placeholder="e.g. 60" />
            </div>
          </CardContent>
        </Card>}

        {activeStep === 7 && <Card id="section-branches">
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
        </Card>}

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 p-4">
          <Button type="button" variant="outline" onClick={goBack} disabled={activeStep === 0}>Back</Button>
          <span className="text-xs text-muted-foreground">Step {activeStep + 1} of {NAV_SECTIONS.length}</span>
          {activeStep < NAV_SECTIONS.length - 1 ? (
            <Button type="button" onClick={goNext} className="bg-gold text-background hover:bg-gold/90">Next</Button>
          ) : <span className="w-[76px]" />}
        </div>

        <div className="relative z-10 flex items-center justify-between rounded-2xl border border-gold/30 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Ready to publish?</span>
            <span className="text-sm font-medium">Save and submit for review</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={saveAll} disabled={saving}>
              {saving ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button className="bg-gold text-background hover:bg-gold/90" onClick={handleSubmitForReview} disabled={submitting || m.status === 'pending'}>
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </div>

      <ImageCropDialog
        open={!!cropTarget}
        imageSrc={cropTarget?.src ?? null}
        aspect={cropTarget?.kind === 'logo' ? 1 : 16 / 9}
        title={cropTarget?.kind === 'logo' ? 'Adjust your logo' : 'Adjust your cover image'}
        onCancel={cancelCrop}
        onConfirm={confirmCrop}
      />
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
