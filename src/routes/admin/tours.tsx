import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { ensureOrganizer } from '@/components/tour/use-my-organizer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, X, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOUR_CATEGORIES, CURRENCIES, DURATION_OPTIONS, DIFFICULTY, TRANSPORTATION_TYPES } from '@/lib/tour-constants';
import { MapPicker } from '@/components/merchant/MapPicker';
import type { Tour, TourStatus, TourDestination, TourPhoto } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/admin/tours')({ ssr: false, component: AdminTours });

const STATUS_OPTIONS: TourStatus[] = ['draft', 'pending', 'approved', 'rejected'];

function AdminTours() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState<Partial<Tour> | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: '/' }); return; }
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => {
        const ok = !!data;
        setIsAdmin(ok);
        if (!ok) { toast.error('Access Denied'); nav({ to: '/' }); }
      });
  }, [user, loading]);

  async function reload() {
    const { data } = await supabase.from('tours').select('*').order('submitted_at', { ascending: false });
    setTours((data ?? []) as Tour[]);
  }
  useEffect(() => { if (isAdmin) reload(); }, [isAdmin]);

  async function createNew() {
    if (!user) return;
    setCreating(true);
    try {
      // "ErbilGo Team" is a house organizer owned by whichever admin creates
      // the first tour here. Because you now own that organizer row, you can
      // also manage this tour's stops / gallery / availability later by
      // navigating to /tour/tours in this same session — no separate admin
      // UI needed for those.
      const org = await ensureOrganizer(user.id, user.email ?? '', 'ErbilGo Team');
      // Nothing is written to the tours table yet — this is a blank,
      // in-memory draft. It only becomes a real row when Save is clicked
      // below, so cancelling or closing the tab leaves no orphan record.
      setEditing({
        organizer_id: org.id, title: '', short_description: '', full_description: '',
        category: 'city', destination: '', cover_url: '', adult_price: null,
        currency: 'USD', status: 'draft',
      });
    } catch (e: any) {
      toast.error(e.message ?? 'Could not prepare organizer profile');
    } finally {
      setCreating(false);
    }
  }

  async function approve(id: string) {
    await supabase.from('tours').update({
      status: 'approved', reviewed_at: new Date().toISOString(),
      reviewed_by: user!.id, rejection_reason: null,
    }).eq('id', id);
    reload();
  }
  async function reject(id: string) {
    if (!reason) return toast.error('Provide a reason first');
    await supabase.from('tours').update({
      status: 'rejected', reviewed_at: new Date().toISOString(),
      reviewed_by: user!.id, rejection_reason: reason,
    }).eq('id', id);
    setReason('');
    reload();
  }
  async function del(id: string) {
    if (!confirm('Delete this tour permanently?')) return;
    await supabase.from('tours').delete().eq('id', id);
    reload();
  }
  async function suspendOrganizer(organizerId: string) {
    if (!confirm('Suspend this organizer?')) return;
    await supabase.from('tour_organizers').update({ is_suspended: true }).eq('id', organizerId);
    toast.success('Organizer suspended');
  }

  if (isAdmin === null) return <div className="p-8">Loading…</div>;

  if (editing) {
    return (
      <TourWizard
        initialTour={editing}
        adminUserId={user!.id}
        onClose={() => { setEditing(null); reload(); }}
      />
    );
  }

  const groups = {
    draft: tours.filter((t) => t.status === 'draft'),
    pending: tours.filter((t) => t.status === 'pending'),
    approved: tours.filter((t) => t.status === 'approved'),
    rejected: tours.filter((t) => t.status === 'rejected'),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tour Management</h1>
        <Button onClick={createNew} disabled={creating}>
          {creating ? 'Creating…' : '+ New Tour'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(['pending','approved','rejected'] as const).map((k) => (
          <Card key={k}><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{k[0].toUpperCase()+k.slice(1)}</p>
            <p className="text-3xl font-bold">{groups[k].length}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
        </TabsList>
        {(['pending','approved','rejected','draft'] as const).map((k) => (
          <TabsContent key={k} value={k} className="space-y-3">
            {k === 'pending' && (
              <Textarea placeholder="Rejection reason (used when rejecting)" value={reason} onChange={(e) => setReason(e.target.value)} />
            )}
            {groups[k].map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{t.title || 'Untitled tour'}</CardTitle>
                    <Badge>{t.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{t.short_description}</p>
                  <p className="text-xs text-muted-foreground">{t.destination} • {t.category}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Edit</Button>
                    {t.status !== 'approved' && <Button size="sm" onClick={() => approve(t.id)}>Approve</Button>}
                    {t.status !== 'rejected' && <Button size="sm" variant="destructive" onClick={() => reject(t.id)}>Reject</Button>}
                    <Button size="sm" variant="outline" onClick={() => suspendOrganizer(t.organizer_id)}>Suspend organizer</Button>
                    <Button size="sm" variant="ghost" onClick={() => del(t.id)}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {groups[k].length === 0 && <p className="text-muted-foreground">No tours here.</p>}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny "type a value, press Enter, get a removable chip" input. Used for
// free-text lists that don't fit a fixed dropdown: languages, what's
// included, what's not, and packing tips ("bring good walking shoes").
// ---------------------------------------------------------------------------
function TagInput({ value, onChange, placeholder }:
  { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  function add() {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 py-1 pl-3 pr-1">
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))}
              className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="outline" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

const WIZARD_STEPS = ['Basics', 'Itinerary', 'Photos', 'Logistics & Tips', 'Pricing & Publish'] as const;

function TourWizard({ initialTour, adminUserId, onClose }:
  { initialTour: Partial<Tour>; adminUserId: string; onClose: () => void }) {
  const [t, setT] = useState<Partial<Tour>>(initialTour);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Tour>(k: K, v: Tour[K]) => setT((p) => ({ ...p, [k]: v }));

  const hasId = !!t.id;

  // --- step 1: basics -------------------------------------------------
  async function saveBasics() {
    if (!t.title?.trim()) return toast.error('Give the tour a title first');
    setSaving(true);
    const fields = {
      title: t.title, short_description: t.short_description, full_description: t.full_description,
      category: t.category, difficulty: t.difficulty, languages: t.languages,
      min_guests: t.min_guests, max_guests: t.max_guests, duration_type: t.duration_type,
    };
    const { data, error } = t.id
      ? await supabase.from('tours').update(fields).eq('id', t.id).select('*').single()
      : await supabase.from('tours').insert({ ...fields, organizer_id: t.organizer_id }).select('*').single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setT(data as Tour);
    toast.success('Saved');
    setStep(1);
  }

  // --- step 2: itinerary ------------------------------------------------
  const [stops, setStops] = useState<TourDestination[]>([]);
  type StopDraft = { name: string; description: string; visit_duration_min: number | null; latitude: number | null; longitude: number | null; showMap: boolean };
  const blankDraft: StopDraft = { name: '', description: '', visit_duration_min: null, latitude: null, longitude: null, showMap: false };
  // A stop being typed but not saved yet. Shown automatically for the very
  // first stop (nothing to click yet) and opened by "+ Add next
  // destination" for every stop after that.
  const [draftStop, setDraftStop] = useState<StopDraft | null>(null);

  async function loadStops() {
    if (!t.id) return;
    const { data } = await supabase.from('tour_destinations').select('*').eq('tour_id', t.id).order('sort_order');
    const rows = (data ?? []) as TourDestination[];
    setStops(rows);
    if (rows.length === 0) setDraftStop((d) => d ?? { ...blankDraft });
  }
  useEffect(() => { if (step === 1) loadStops(); }, [step, t.id]);

  function startDraftStop() {
    setDraftStop({ ...blankDraft });
  }
  function cancelDraftStop() {
    // Only offered once there's at least one saved stop — the very first
    // one always needs a name before you can move on.
    setDraftStop(null);
  }
  async function saveDraftStop() {
    if (!t.id || !draftStop) return;
    if (!draftStop.name.trim()) return toast.error('Give this stop a name first');
    const { data, error } = await supabase.from('tour_destinations').insert({
      tour_id: t.id, sort_order: stops.length, name: draftStop.name,
      description: draftStop.description, visit_duration_min: draftStop.visit_duration_min,
      latitude: draftStop.latitude, longitude: draftStop.longitude,
    }).select('*').single();
    if (error) return toast.error(error.message);
    setStops((p) => [...p, data as TourDestination]);
    setDraftStop(null);
  }
  function editStopLocal(id: string, patch: Partial<TourDestination>) {
    setStops((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  async function saveStop(s: TourDestination) {
    await supabase.from('tour_destinations').update({
      name: s.name, description: s.description, visit_duration_min: s.visit_duration_min,
      latitude: s.latitude, longitude: s.longitude,
    }).eq('id', s.id);
  }
  async function removeStop(id: string) {
    if (stops.length <= 1) return; // keep at least one stop
    await supabase.from('tour_destinations').delete().eq('id', id);
    setStops((p) => p.filter((s) => s.id !== id));
  }

  // --- step 3: photos ---------------------------------------------------
  const [photos, setPhotos] = useState<TourPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  async function loadPhotos() {
    if (!t.id) return;
    const { data } = await supabase.from('tour_photos').select('*').eq('tour_id', t.id).order('sort_order');
    setPhotos((data ?? []) as TourPhoto[]);
  }
  useEffect(() => { if (step === 2) loadPhotos(); }, [step, t.id]);

  async function uploadCover(f: File) {
    if (!t.id) return;
    setUploading(true);
    const key = `${adminUserId}/${t.id}/cover-${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from('tour-media').upload(key, f, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from('tour-media').getPublicUrl(key);
    await supabase.from('tours').update({ cover_url: data.publicUrl }).eq('id', t.id);
    set('cover_url', data.publicUrl);
    setUploading(false);
  }
  async function uploadGallery(fs: FileList) {
    if (!t.id) return;
    setUploading(true);
    for (const f of Array.from(fs)) {
      const key = `${adminUserId}/${t.id}/gallery-${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from('tour-media').upload(key, f);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from('tour-media').getPublicUrl(key);
      await supabase.from('tour_photos').insert({ tour_id: t.id, url: data.publicUrl, kind: 'gallery' });
    }
    setUploading(false);
    loadPhotos();
  }
  async function removePhoto(p: TourPhoto) {
    await supabase.from('tour_photos').delete().eq('id', p.id);
    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
  }

  // --- step 4: logistics --------------------------------------------------
  async function saveLogistics() {
    if (!t.id) return;
    setSaving(true);
    const { error } = await supabase.from('tours').update({
      destination: t.destination, transportation_type: t.transportation_type,
      included: t.included, not_included: t.not_included, requirements: t.requirements,
    }).eq('id', t.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setStep(4);
  }

  // --- step 5: pricing & publish -----------------------------------------
  async function savePricingAndPublish(publishStatus?: TourStatus) {
    if (!t.id) return;
    setSaving(true);
    const status = publishStatus ?? t.status;
    const { error } = await supabase.from('tours').update({
      adult_price: t.adult_price, child_price: t.child_price, currency: t.currency,
      booking_deadline_hours: t.booking_deadline_hours, status,
      ...(status === 'approved'
        ? { reviewed_at: new Date().toISOString(), reviewed_by: adminUserId, rejection_reason: null }
        : {}),
    }).eq('id', t.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(status === 'approved' ? 'Tour published' : 'Saved');
    onClose();
  }

  const canLeaveBasics = hasId; // stops/photos need a real tour_id to attach to

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.title || 'New Tour'}</h1>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>

      <div className="flex gap-8">
        {/* Stepper */}
        <div className="hidden w-48 shrink-0 space-y-1 md:block">
          {WIZARD_STEPS.map((label, i) => {
            const locked = i > 0 && !canLeaveBasics;
            const active = i === step;
            return (
              <button
                key={label}
                type="button"
                disabled={locked}
                onClick={() => setStep(i)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  locked && 'cursor-not-allowed opacity-40',
                )}
              >
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs',
                  active ? 'border-primary-foreground' : 'border-current',
                )}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 space-y-6">
          {step === 0 && (
            <Card>
              <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Title</Label>
                  <Input value={t.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Shaqlawa Mountain Day Trip" />
                </div>
                <div className="md:col-span-2">
                  <Label>Short description</Label>
                  <Input value={t.short_description ?? ''} onChange={(e) => set('short_description', e.target.value)}
                    placeholder="One line shown on the tour card" />
                </div>
                <div className="md:col-span-2">
                  <Label>Full description</Label>
                  <Textarea rows={4} value={t.full_description ?? ''} onChange={(e) => set('full_description', e.target.value)} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={t.category} onValueChange={(v) => set('category', v as Tour['category'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TOUR_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={t.difficulty ?? 'easy'} onValueChange={(v) => set('difficulty', v as Tour['difficulty'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Select value={t.duration_type ?? 'half_day'} onValueChange={(v) => set('duration_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min guests</Label>
                  <Input type="number" value={t.min_guests ?? ''} onChange={(e) => set('min_guests', e.target.value ? +e.target.value : null)} />
                </div>
                <div>
                  <Label>Max guests</Label>
                  <Input type="number" value={t.max_guests ?? ''} onChange={(e) => set('max_guests', e.target.value ? +e.target.value : null)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Languages</Label>
                  <TagInput value={t.languages ?? []} onChange={(v) => set('languages', v)} placeholder="English, Kurdish, Arabic…" />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardHeader><CardTitle>Itinerary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {stops.length === 0 && !draftStop && (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                )}

                {stops.map((s, i) => (
                  <div key={s.id} className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Stop {i + 1}{i === 0 && <span className="ml-1">(required)</span>}
                      </span>
                      {stops.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => removeStop(s.id)}>Remove</Button>
                      )}
                    </div>
                    <Input placeholder="Destination name (e.g. Shaqlawa Bazaar)" value={s.name}
                      onChange={(e) => editStopLocal(s.id, { name: e.target.value })}
                      onBlur={() => saveStop(stops.find((x) => x.id === s.id)!)} />
                    <Textarea rows={2} placeholder="What happens here? (optional)" value={s.description}
                      onChange={(e) => editStopLocal(s.id, { description: e.target.value })}
                      onBlur={() => saveStop(stops.find((x) => x.id === s.id)!)} />
                    <div className="w-40">
                      <Label className="text-xs">Time here, minutes (optional)</Label>
                      <Input type="number" value={s.visit_duration_min ?? ''}
                        onChange={(e) => editStopLocal(s.id, { visit_duration_min: e.target.value ? +e.target.value : null })}
                        onBlur={() => saveStop(stops.find((x) => x.id === s.id)!)} />
                    </div>
                    {s.latitude != null && s.longitude != null ? (
                      <p className="text-xs text-muted-foreground">
                        📍 {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                        <button type="button" className="ml-2 underline" onClick={() => editStopLocal(s.id, { latitude: null, longitude: null })}>
                          remove pin
                        </button>
                      </p>
                    ) : (
                      <details>
                        <summary className="cursor-pointer text-xs text-muted-foreground">Pick location on map (optional)</summary>
                        <div className="mt-2 h-56 overflow-hidden rounded-lg border">
                          <MapPicker lat={s.latitude} lng={s.longitude}
                            onChange={(lat, lng) => { editStopLocal(s.id, { latitude: lat, longitude: lng }); saveStop({ ...s, latitude: lat, longitude: lng }); }} />
                        </div>
                      </details>
                    )}
                  </div>
                ))}

                {draftStop && (
                  <div className="space-y-2 rounded-lg border border-dashed p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Stop {stops.length + 1}{stops.length === 0 && <span className="ml-1">(required)</span>}
                      </span>
                      {stops.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={cancelDraftStop}>Cancel</Button>
                      )}
                    </div>
                    <Input autoFocus placeholder="Destination name (e.g. Shaqlawa Bazaar)" value={draftStop.name}
                      onChange={(e) => setDraftStop({ ...draftStop, name: e.target.value })} />
                    <Textarea rows={2} placeholder="What happens here? (optional)" value={draftStop.description}
                      onChange={(e) => setDraftStop({ ...draftStop, description: e.target.value })} />
                    <div className="w-40">
                      <Label className="text-xs">Time here, minutes (optional)</Label>
                      <Input type="number" value={draftStop.visit_duration_min ?? ''}
                        onChange={(e) => setDraftStop({ ...draftStop, visit_duration_min: e.target.value ? +e.target.value : null })} />
                    </div>
                    {draftStop.latitude != null && draftStop.longitude != null ? (
                      <p className="text-xs text-muted-foreground">
                        📍 {draftStop.latitude.toFixed(4)}, {draftStop.longitude.toFixed(4)}
                        <button type="button" className="ml-2 underline" onClick={() => setDraftStop({ ...draftStop, latitude: null, longitude: null })}>
                          remove pin
                        </button>
                      </p>
                    ) : (
                      <details>
                        <summary className="cursor-pointer text-xs text-muted-foreground">Pick location on map (optional)</summary>
                        <div className="mt-2 h-56 overflow-hidden rounded-lg border">
                          <MapPicker lat={draftStop.latitude} lng={draftStop.longitude}
                            onChange={(lat, lng) => setDraftStop({ ...draftStop, latitude: lat, longitude: lng })} />
                        </div>
                      </details>
                    )}
                    <Button onClick={saveDraftStop} className="gap-2">
                      <Plus className="h-4 w-4" /> Save this stop
                    </Button>
                  </div>
                )}

                <Button variant="outline" onClick={startDraftStop} disabled={!!draftStop || stops.length === 0} className="gap-2">
                  <Plus className="h-4 w-4" /> Add next destination
                </Button>
                <p className="text-xs text-muted-foreground">
                  For reordering stops by drag on a full map, use the organizer toolkit at
                  <code> /tour/route-planner</code> once this tour is saved.
                </p>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Cover image</Label>
                  {t.cover_url && <img src={t.cover_url} alt="cover" className="h-40 w-full rounded-lg object-cover" />}
                  <Input type="file" accept="image/*" disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                </div>
                <div className="space-y-2">
                  <Label>Gallery</Label>
                  <Input type="file" accept="image/*" multiple disabled={uploading}
                    onChange={(e) => e.target.files && uploadGallery(e.target.files)} />
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {photos.map((p) => (
                      <div key={p.id} className="relative">
                        <img src={p.url} className="h-28 w-full rounded object-cover" alt="" />
                        <Button size="sm" variant="destructive" className="absolute right-1 top-1 h-6 w-6 p-0"
                          onClick={() => removePhoto(p)}>×</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader><CardTitle>Logistics & Tips</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Destination area</Label>
                  <Input value={t.destination ?? ''} onChange={(e) => set('destination', e.target.value)} placeholder="e.g. Shaqlawa" />
                </div>
                <div>
                  <Label>Transportation</Label>
                  <Select value={t.transportation_type ?? ''} onValueChange={(v) => set('transportation_type', v)}>
                    <SelectTrigger><SelectValue placeholder="How do guests get around?" /></SelectTrigger>
                    <SelectContent>
                      {TRANSPORTATION_TYPES.map((tt) => <SelectItem key={tt} value={tt}>{tt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>What's included</Label>
                  <TagInput value={t.included ?? []} onChange={(v) => set('included', v)} placeholder="e.g. Lunch, transport…" />
                </div>
                <div>
                  <Label>Not included</Label>
                  <TagInput value={t.not_included ?? []} onChange={(v) => set('not_included', v)} placeholder="e.g. Entry tickets…" />
                </div>
                <div>
                  <Label>What to bring / requirements</Label>
                  <TagInput value={t.requirements ?? []} onChange={(v) => set('requirements', v)}
                    placeholder="e.g. Comfortable walking shoes, water bottle…" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    This is where hiking/nature-trail prep tips like "wear proper shoes" go — shown to guests before booking.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader><CardTitle>Pricing & Publish</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Adult price</Label>
                  <Input type="number" value={t.adult_price ?? ''} onChange={(e) => set('adult_price', e.target.value ? +e.target.value : null)} />
                </div>
                <div>
                  <Label>Child price</Label>
                  <Input type="number" value={t.child_price ?? ''} onChange={(e) => set('child_price', e.target.value ? +e.target.value : null)} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={t.currency} onValueChange={(v) => set('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Booking deadline (hours before)</Label>
                  <Input type="number" value={t.booking_deadline_hours ?? 24}
                    onChange={(e) => set('booking_deadline_hours', e.target.value ? +e.target.value : 24)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Status</Label>
                  <Select value={t.status} onValueChange={(v) => set('status', v as TourStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Controls whether this is visible on the public site. "Publish" below sets it to
                    approved for you — you only need this dropdown to save as pending/rejected instead.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {step === 0 && <Button onClick={saveBasics} disabled={saving} className="gap-1">
              {saving ? 'Saving…' : 'Save & Continue'} <ArrowRight className="h-4 w-4" />
            </Button>}
            {step === 1 && <Button onClick={() => setStep(2)} disabled={stops.length === 0} className="gap-1">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>}
            {step === 2 && <Button onClick={() => setStep(3)} className="gap-1">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>}
            {step === 3 && <Button onClick={saveLogistics} disabled={saving} className="gap-1">
              {saving ? 'Saving…' : 'Save & Continue'} <ArrowRight className="h-4 w-4" />
            </Button>}
            {step === 4 && (
              <div className="flex gap-2">
                <Button variant="outline" disabled={saving} onClick={() => savePricingAndPublish()}>Save as draft</Button>
                <Button disabled={saving} onClick={() => savePricingAndPublish('approved')}>
                  {saving ? 'Publishing…' : 'Publish'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
