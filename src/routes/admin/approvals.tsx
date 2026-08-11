import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { logActivity } from '@/components/admin/log-activity';
import { Eye } from 'lucide-react';
import type { Merchant } from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/admin/approvals')({ component: Approvals });

function Approvals() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['admin-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('merchants').select('*')
        .order('submitted_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Merchant[];
    },
  });

  async function approve(m: Merchant) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('merchants').update({
      status: 'approved', reviewed_at: new Date().toISOString(),
      reviewed_by: u.user?.id, rejection_reason: null, pending_changes: null,
    } as any).eq('id', m.id);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'business.approved', target_type: 'merchant', target_id: m.id, target_label: m.name });
    toast.success('Approved');
    qc.invalidateQueries({ queryKey: ['admin-approvals'] });
  }

  async function reject(m: Merchant, reason: string) {
    if (!reason.trim()) return toast.error('Enter a reason');
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('merchants').update({
      status: 'rejected', reviewed_at: new Date().toISOString(),
      reviewed_by: u.user?.id, rejection_reason: reason, pending_changes: null,
    } as any).eq('id', m.id);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'business.rejected', target_type: 'merchant', target_id: m.id, target_label: m.name, metadata: { reason } });
    toast.success('Rejected');
    qc.invalidateQueries({ queryKey: ['admin-approvals'] });
  }

  async function requestChanges(m: Merchant, note: string) {
    if (!note.trim()) return toast.error('Add a note');
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('merchants').update({
      status: 'draft', rejection_reason: note,
      reviewed_at: new Date().toISOString(), reviewed_by: u.user?.id,
    }).eq('id', m.id);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'business.edited', target_type: 'merchant', target_id: m.id, target_label: m.name, metadata: { changes_requested: note } });
    toast.success('Sent back to merchant');
    qc.invalidateQueries({ queryKey: ['admin-approvals'] });
  }

  const pending = list.data?.filter((m) => m.status === 'pending') ?? [];
  const others = list.data?.filter((m) => m.status !== 'pending') ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Merchant Approvals</h1>
        <p className="text-sm text-muted-foreground">Review submissions and approve, reject, or request changes.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pending ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
        {pending.map((m) => (
          <ReviewCard key={m.id} m={m} onApprove={approve} onReject={reject} onRequest={requestChanges} />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">All submissions</h2>
        {others.map((m) => (
          <ReviewCard key={m.id} m={m} onApprove={approve} onReject={reject} onRequest={requestChanges} compact />
        ))}
      </section>
    </div>
  );
}

function ChangesSummary({ changes }: { changes: any }) {
  if (!changes || Object.keys(changes).length === 0) return null;
  return (
    <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gold">What changed</p>
      <ul className="space-y-1 text-xs">
        {Object.entries(changes).map(([field, value]: [string, any]) => {
          if (typeof value === 'string') {
            return <li key={field}><span className="font-medium">{field}:</span> {value}</li>;
          }
          if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
            return (
              <li key={field}>
                <span className="font-medium">{field}:</span>{' '}
                <span className="text-muted-foreground line-through">{value.old || '—'}</span>{' '}
                → <span>{value.new || '—'}</span>
              </li>
            );
          }
          if (value && typeof value === 'object' && ('added' in value || 'removed' in value)) {
            const added: string[] = value.added ?? [];
            const removed: string[] = value.removed ?? [];
            return (
              <li key={field}>
                <span className="font-medium">{field}:</span>{' '}
                {added.length > 0 && <span className="text-green-600">+ {added.join(', ')}</span>}
                {added.length > 0 && removed.length > 0 && '  '}
                {removed.length > 0 && <span className="text-destructive">− {removed.join(', ')}</span>}
              </li>
            );
          }
          return null;
        })}
      </ul>
    </div>
  );
}

function ReviewCard({
  m, onApprove, onReject, onRequest, compact,
}: {
  m: Merchant;
  onApprove: (m: Merchant) => void;
  onReject: (m: Merchant, r: string) => void;
  onRequest: (m: Merchant, r: string) => void;
  compact?: boolean;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const needsData = !compact || showProfile;
  const photos = useQuery({
    queryKey: ['admin-review-photos', m.id],
    enabled: needsData,
    queryFn: async () => (await supabase.from('merchant_photos').select('*').eq('merchant_id', m.id).order('sort_order')).data ?? [],
  });
  const hours = useQuery({
    queryKey: ['admin-review-hours', m.id],
    enabled: needsData,
    queryFn: async () => (await supabase.from('merchant_hours').select('*').eq('merchant_id', m.id).order('day_of_week')).data ?? [],
  });
  const color = m.status === 'approved' ? 'bg-green-500/10 text-green-700'
    : m.status === 'rejected' ? 'bg-destructive/10 text-destructive'
    : m.status === 'pending' ? 'bg-yellow-500/10 text-yellow-700' : 'bg-muted';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <Dialog open={showProfile} onOpenChange={setShowProfile}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 text-left hover:underline">
                <span>{m.name || '(untitled)'} <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">{m.category}</span></span>
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{m.name || '(untitled)'}</DialogTitle>
              </DialogHeader>

              {m.cover_url && (
                <img src={m.cover_url} alt="cover" className="h-48 w-full rounded-lg object-cover" />
              )}

              <ChangesSummary changes={(m as any).pending_changes} />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-1 font-semibold">Basic info</h3>
                  <p className="text-muted-foreground">{m.description || '—'}</p>
                  <p className="mt-2 text-xs">{m.address}, {m.city}</p>
                  <p className="text-xs">{m.phone} · {m.email}</p>
                  <p className="text-xs text-muted-foreground">{m.website}</p>
                  <p className="mt-2 text-xs">
                    {[m.instagram, m.facebook, m.tiktok, m.whatsapp].filter(Boolean).join(' · ') || 'No social links'}
                  </p>
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">AI Planning</h3>
                  <p className="text-xs">Mood: {m.mood_tags?.join(', ') || '—'}</p>
                  <p className="text-xs">Best time: {m.best_visit_time?.join(', ') || '—'}</p>
                  <p className="text-xs">Duration: {m.avg_duration_minutes ?? '—'} min · Price: {m.price_level ?? '—'}</p>
                  <p className="text-xs">Suitability: {m.suitability?.join(', ') || '—'}</p>
                  <p className="text-xs">Transport: {m.transportation?.join(', ') || '—'}</p>
                  <p className="text-xs">Features: {m.features?.join(', ') || '—'}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Photos ({(photos.data?.length ?? 0) + (m.logo_url ? 1 : 0) + (m.cover_url ? 1 : 0)})</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {m.logo_url && (
                    <a href={m.logo_url} target="_blank" rel="noreferrer">
                      <img src={m.logo_url} alt="logo" className="aspect-square w-full rounded-lg object-cover transition hover:opacity-80" />
                    </a>
                  )}
                  {m.cover_url && (
                    <a href={m.cover_url} target="_blank" rel="noreferrer">
                      <img src={m.cover_url} alt="cover" className="aspect-square w-full rounded-lg object-cover transition hover:opacity-80" />
                    </a>
                  )}
                  {photos.data?.map((p: any) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                      <img src={p.url} alt="" className="aspect-square w-full rounded-lg object-cover transition hover:opacity-80" />
                    </a>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Click any photo to open it full-size in a new tab.</p>
              </div>

              <div>
                <h3 className="mb-1 font-semibold">Opening hours</h3>
                <div className="grid grid-cols-2 gap-1 text-xs md:grid-cols-4">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => {
                    const h = hours.data?.find((x: any) => x.day_of_week === i);
                    return <div key={d}>{d}: {h?.is_24h ? '24h' : h?.is_closed ? 'Closed' : h ? `${h.open_time}–${h.close_time}` : '—'}</div>;
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Badge className={color}>{m.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ChangesSummary changes={(m as any).pending_changes} />

        {!compact && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-1 font-semibold">Basic info</h3>
                <p className="text-muted-foreground">{m.description || '—'}</p>
                <p className="mt-2 text-xs">{m.address} · {m.phone} · {m.email}</p>
                <p className="text-xs text-muted-foreground">{m.website}</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">AI Planning</h3>
                <p className="text-xs">Mood: {m.mood_tags?.join(', ') || '—'}</p>
                <p className="text-xs">Best time: {m.best_visit_time?.join(', ') || '—'}</p>
                <p className="text-xs">Duration: {m.avg_duration_minutes ?? '—'} min · Price: {m.price_level ?? '—'}</p>
                <p className="text-xs">Suitability: {m.suitability?.join(', ') || '—'}</p>
                <p className="text-xs">Transport: {m.transportation?.join(', ') || '—'}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-1 font-semibold">Photos ({photos.data?.length ?? 0})</h3>
              <div className="flex flex-wrap gap-2">
                {m.logo_url && <img src={m.logo_url} alt="logo" className="h-16 w-16 rounded object-cover" />}
                {m.cover_url && <img src={m.cover_url} alt="cover" className="h-16 w-24 rounded object-cover" />}
                {photos.data?.map((p: any) => (
                  <img key={p.id} src={p.url} alt="" className="h-16 w-16 rounded object-cover" />
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-1 font-semibold">Opening hours</h3>
              <div className="grid grid-cols-2 gap-1 text-xs md:grid-cols-4">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => {
                  const h = hours.data?.find((x: any) => x.day_of_week === i);
                  return <div key={d}>{d}: {h?.is_24h ? '24h' : h?.is_closed ? 'Closed' : h ? `${h.open_time}–${h.close_time}` : '—'}</div>;
                })}
              </div>
            </div>
          </>
        )}

        {m.status === 'rejected' && m.rejection_reason && (
          <p className="text-xs text-destructive">Reason: {m.rejection_reason}</p>
        )}

        {m.status === 'pending' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => onApprove(m)}>Approve</Button>

            <Dialog>
              <DialogTrigger asChild><Button size="sm" variant="destructive">Reject</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Reject submission</DialogTitle></DialogHeader>
                <Textarea placeholder="Explain why this is being rejected…" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
                <DialogFooter>
                  <Button variant="destructive" onClick={() => onReject(m, reason)}>Confirm rejection</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild><Button size="sm" variant="outline">Request changes</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Request changes</DialogTitle></DialogHeader>
                <Textarea placeholder="What should the merchant update?" value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
                <DialogFooter>
                  <Button onClick={() => onRequest(m, note)}>Send</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
