import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';
import { useMyTours, setSelectedTour, useSelectedTour } from '@/components/tour/use-tours';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPicker } from '@/components/merchant/MapPicker';
import { toast } from 'sonner';
import { TOUR_CATEGORIES, DURATION_OPTIONS, DIFFICULTY, LANGUAGES, TOUR_FEATURES,
  MOOD_TAGS, TARGET_AUDIENCE, BEST_TIME, SEASONS, TRANSPORTATION_TYPES } from '@/lib/tour-constants';
import type { Tour } from '@/integrations/supabase/tour-types';
import { Checkbox } from '@/components/ui/checkbox';

export const Route = createFileRoute('/tour/_authenticated/tours')({ component: MyTours });

function CsvArray({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Textarea rows={2}
      value={value.join('\n')}
      onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
      placeholder="One per line"
    />
  );
}

function TagCheckboxes({ options, value, onChange }:
  { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (t: string) =>
    onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1 text-sm">
          <Checkbox checked={value.includes(o)} onCheckedChange={() => toggle(o)} />
          {o}
        </label>
      ))}
    </div>
  );
}

function MyTours() {
  const { user } = useAuth();
  const { data: org } = useMyOrganizer(user?.id);
  const qc = useQueryClient();
  const { data: tours = [] } = useMyTours(org?.id);
  const selectedId = useSelectedTour();
  const [editing, setEditing] = useState<Tour | null>(null);

  async function createNew() {
    if (!org) return;
    const { data, error } = await supabase.from('tours').insert({
      organizer_id: org.id, title: 'New Tour',
    }).select('*').single();
    if (error) return toast.error(error.message);
    setSelectedTour(data.id);
    setEditing(data as Tour);
    qc.invalidateQueries({ queryKey: ['my-tours', org.id] });
  }

  async function save(t: Tour) {
    const { error } = await supabase.from('tours').update({
      title: t.title, short_description: t.short_description, full_description: t.full_description,
      category: t.category, meeting_point: t.meeting_point, meeting_lat: t.meeting_lat, meeting_lng: t.meeting_lng,
      destination: t.destination, duration_type: t.duration_type, duration_custom: t.duration_custom,
      languages: t.languages, max_guests: t.max_guests, min_guests: t.min_guests,
      included: t.included, not_included: t.not_included, requirements: t.requirements,
      difficulty: t.difficulty, features: t.features, mood_tags: t.mood_tags,
      target_audience: t.target_audience, best_time: t.best_time, season: t.season,
      walking_distance_km: t.walking_distance_km, transportation_type: t.transportation_type,
    }).eq('id', t.id);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    qc.invalidateQueries({ queryKey: ['my-tours', org?.id] });
  }

  async function del(id: string) {
    if (!confirm('Delete this tour?')) return;
    await supabase.from('tours').delete().eq('id', id);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ['my-tours', org?.id] });
  }

  if (editing) return <EditForm tour={editing} onDone={() => setEditing(null)} onSave={save} onDelete={del} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Tours</h2>
        <Button onClick={createNew}>+ New Tour</Button>
      </div>
      {tours.length === 0 && <p className="text-muted-foreground">No tours yet.</p>}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {tours.map((t) => (
          <Card key={t.id} className={selectedId === t.id ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{t.title || 'Untitled'}</CardTitle>
                <Badge variant={t.status === 'approved' ? 'default' : 'secondary'}>{t.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{t.short_description || '—'}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { setSelectedTour(t.id); setEditing(t); }}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedTour(t.id)}>Select</Button>
                <Button size="sm" variant="destructive" onClick={() => del(t.id)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EditForm({ tour, onDone, onSave, onDelete }:
  { tour: Tour; onDone: () => void; onSave: (t: Tour) => Promise<void>; onDelete: (id: string) => void }) {
  const [t, setT] = useState<Tour>(tour);
  const set = <K extends keyof Tour>(k: K, v: Tour[K]) => setT((p) => ({ ...p, [k]: v }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Edit Tour</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone}>Back</Button>
          <Button onClick={() => onSave(t)}>Save</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Title</Label>
            <Input value={t.title} onChange={(e) => set('title', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Short description</Label>
            <Input value={t.short_description} onChange={(e) => set('short_description', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Full description</Label>
            <Textarea rows={5} value={t.full_description} onChange={(e) => set('full_description', e.target.value)} /></div>
          <div><Label>Category</Label>
            <Select value={t.category} onValueChange={(v) => set('category', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TOUR_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Difficulty</Label>
            <Select value={t.difficulty} onValueChange={(v) => set('difficulty', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DIFFICULTY.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Duration</Label>
            <Select value={t.duration_type} onValueChange={(v) => set('duration_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DURATION_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Custom duration</Label>
            <Input value={t.duration_custom} onChange={(e) => set('duration_custom', e.target.value)} placeholder="e.g. 5 hours"/></div>
          <div><Label>Destination</Label>
            <Input value={t.destination} onChange={(e) => set('destination', e.target.value)} /></div>
          <div><Label>Meeting point</Label>
            <Input value={t.meeting_point} onChange={(e) => set('meeting_point', e.target.value)} /></div>
          <div><Label>Min guests</Label>
            <Input type="number" value={t.min_guests ?? ''} onChange={(e) => set('min_guests', e.target.value ? +e.target.value : null)} /></div>
          <div><Label>Max guests</Label>
            <Input type="number" value={t.max_guests ?? ''} onChange={(e) => set('max_guests', e.target.value ? +e.target.value : null)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Meeting Point (Map)</CardTitle></CardHeader>
        <CardContent>
          <MapPicker lat={t.meeting_lat} lng={t.meeting_lng}
            onChange={(la, ln) => { set('meeting_lat', la); set('meeting_lng', ln); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Languages, Included / Not included / Requirements</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Languages</Label>
            <TagCheckboxes options={LANGUAGES} value={t.languages} onChange={(v) => set('languages', v)} /></div>
          <div><Label>Included</Label><CsvArray value={t.included} onChange={(v) => set('included', v)} /></div>
          <div><Label>Not included</Label><CsvArray value={t.not_included} onChange={(v) => set('not_included', v)} /></div>
          <div><Label>Requirements</Label><CsvArray value={t.requirements} onChange={(v) => set('requirements', v)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Features</CardTitle></CardHeader>
        <CardContent><TagCheckboxes options={TOUR_FEATURES} value={t.features} onChange={(v) => set('features', v)} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AI Planning Data</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Mood tags</Label><TagCheckboxes options={MOOD_TAGS} value={t.mood_tags} onChange={(v) => set('mood_tags', v)} /></div>
          <div><Label>Target audience</Label><TagCheckboxes options={TARGET_AUDIENCE} value={t.target_audience} onChange={(v) => set('target_audience', v)} /></div>
          <div><Label>Best time</Label><TagCheckboxes options={BEST_TIME} value={t.best_time} onChange={(v) => set('best_time', v)} /></div>
          <div><Label>Season</Label><TagCheckboxes options={SEASONS} value={t.season} onChange={(v) => set('season', v)} /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Walking distance (km)</Label>
              <Input type="number" step="0.1" value={t.walking_distance_km ?? ''}
                onChange={(e) => set('walking_distance_km', e.target.value ? +e.target.value : null)} /></div>
            <div><Label>Transportation type</Label>
              <Select value={t.transportation_type ?? ''} onValueChange={(v) => set('transportation_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{TRANSPORTATION_TYPES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="destructive" onClick={() => onDelete(t.id)}>Delete Tour</Button>
        <Button onClick={() => onSave(t)}>Save</Button>
      </div>
    </div>
  );
}
