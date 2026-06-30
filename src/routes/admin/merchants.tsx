import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Merchant, AppRole } from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/admin/merchants')({
  component: AdminMerchants,
});

function AdminMerchants() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [checking, setChecking] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    supabase.from('user_roles').select('role').eq('user_id', user.id).then(({ data }) => {
      const r = (data ?? []).find((x: any) => x.role === 'admin');
      setRole(r ? 'admin' : null);
      setChecking(false);
    });
  }, [user]);

  const mq = useQuery({
    queryKey: ['admin-merchants'],
    enabled: role === 'admin',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants').select('*').order('submitted_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Merchant[];
    },
  });

  if (loading || checking) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!user) return <div className="p-8">Please sign in.</div>;
  if (role !== 'admin') return <div className="p-8 text-destructive">Admin access required.</div>;

  async function approve(id: string) {
    const { error } = await supabase.from('merchants')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user!.id, rejection_reason: null })
      .eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Approved');
    qc.invalidateQueries({ queryKey: ['admin-merchants'] });
  }

  async function reject(id: string, reason: string) {
    if (!reason.trim()) return toast.error('Please enter a reason');
    const { error } = await supabase.from('merchants')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user!.id, rejection_reason: reason })
      .eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Rejected');
    qc.invalidateQueries({ queryKey: ['admin-merchants'] });
  }

  const pending = mq.data?.filter((m) => m.status === 'pending') ?? [];
  const others = mq.data?.filter((m) => m.status !== 'pending') ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin · Merchants</h1>
        <p className="text-muted-foreground">Approve or reject merchant submissions.</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Pending review ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending submissions.</p>}
        {pending.map((m) => <MerchantRow key={m.id} m={m} onApprove={approve} onReject={reject} />)}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">All listings</h2>
        {others.map((m) => <MerchantRow key={m.id} m={m} onApprove={approve} onReject={reject} compact />)}
      </section>
    </div>
  );
}

function MerchantRow({ m, onApprove, onReject, compact }: {
  m: Merchant; onApprove: (id: string) => void; onReject: (id: string, r: string) => void; compact?: boolean;
}) {
  const [reason, setReason] = useState('');
  const color =
    m.status === 'approved' ? 'bg-green-500/10 text-green-700' :
    m.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
    m.status === 'pending' ? 'bg-yellow-500/10 text-yellow-700' : '';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{m.name || '(no name)'} <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">{m.category}</span></span>
          <Badge className={color}>{m.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!compact && <p className="text-muted-foreground">{m.description || '—'}</p>}
        <div className="text-xs text-muted-foreground">
          {m.address} · {m.phone} · features: {m.features?.length ?? 0}
        </div>
        {m.status === 'pending' && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="sm" onClick={() => onApprove(m.id)}>Approve</Button>
            <Textarea placeholder="Rejection reason…" value={reason} onChange={(e) => setReason(e.target.value)} className="flex-1" rows={1} />
            <Button size="sm" variant="destructive" onClick={() => onReject(m.id, reason)}>Reject</Button>
          </div>
        )}
        {m.status === 'rejected' && m.rejection_reason && (
          <p className="text-xs text-destructive">Reason: {m.rejection_reason}</p>
        )}
      </CardContent>
    </Card>
  );
}
