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
import { TOUR_CATEGORIES, CURRENCIES } from '@/lib/tour-constants';
import type { Tour, TourStatus } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/admin/tours')({ ssr: false, component: AdminTours });

const STATUS_OPTIONS: TourStatus[] = ['draft', 'pending', 'approved', 'rejected'];

function AdminTours() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState<Tour | null>(null);
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
      // signing in at /tour/login with this same admin account and using
      // "My Tours" — no separate admin UI needed for those.
      const org = await ensureOrganizer(user.id, user.email ?? '', 'ErbilGo Team');
      const { data, error } = await supabase.from('tours').insert({
        organizer_id: org.id, title: 'New Tour',
      }).select('*').single();
      if (error) throw error;
      setEditing(data as Tour);
    } catch (e: any) {
      toast.error(e.message ?? 'Could not create tour');
    } finally {
      setCreating(false);
    }
  }

  async function save(t: Tour) {
    const { error } = await supabase.from('tours').update({
      title: t.title,
      short_description: t.short_description,
      full_description: t.full_description,
      category: t.category,
      destination: t.destination,
      cover_url: t.cover_url,
      adult_price: t.adult_price,
      currency: t.currency,
      status: t.status,
      ...(t.status === 'approved'
        ? { reviewed_at: new Date().toISOString(), reviewed_by: user!.id, rejection_reason: null }
        : {}),
    }).eq('id', t.id);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setEditing(null);
    reload();
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
    return <EditTourForm tour={editing} onCancel={() => setEditing(null)} onSave={save} />;
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

function EditTourForm({ tour, onCancel, onSave }:
  { tour: Tour; onCancel: () => void; onSave: (t: Tour) => Promise<void> }) {
  const [t, setT] = useState<Tour>(tour);
  const set = <K extends keyof Tour>(k: K, v: Tour[K]) => setT((p) => ({ ...p, [k]: v }));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Tour</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Back</Button>
          <Button onClick={() => onSave(t)}>Save</Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Title</Label>
            <Input value={t.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Short description</Label>
            <Input value={t.short_description} onChange={(e) => set('short_description', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Full description</Label>
            <Textarea rows={4} value={t.full_description} onChange={(e) => set('full_description', e.target.value)} />
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
            <Label>Status</Label>
            <Select value={t.status} onValueChange={(v) => set('status', v as TourStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Destination</Label>
            <Input value={t.destination} onChange={(e) => set('destination', e.target.value)} />
          </div>
          <div>
            <Label>Cover image URL</Label>
            <Input value={t.cover_url ?? ''} onChange={(e) => set('cover_url', e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <Label>Adult price</Label>
            <Input type="number" value={t.adult_price ?? ''}
              onChange={(e) => set('adult_price', e.target.value ? +e.target.value : null)} />
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
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        For stops, gallery photos and availability on this tour, sign in at <code>/tour/login</code> with
        this same admin account and open <b>My Tours</b> — you're the owner of the "ErbilGo Team"
        organizer profile, so the full organizer toolkit works for tours created here too.
      </p>
    </div>
  );
}
