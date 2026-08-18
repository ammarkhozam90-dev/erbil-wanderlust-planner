import { createFileRoute, Link } from '@tanstack/react-router';
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
import { ExternalLink } from 'lucide-react';

export const Route = createFileRoute('/admin/claims')({ component: ClaimRequests });

function ClaimRequests() {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const list = useQuery({
    queryKey: ['admin-claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_claims')
        .select('*, merchants(id,name,category,city,address)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function approve(claimId: string) {
    const { error } = await supabase.rpc('approve_merchant_claim', { p_claim_id: claimId });
    if (error) return toast.error(error.message);
    toast.success('Claim approved — ownership transferred.');
    qc.invalidateQueries({ queryKey: ['admin-claims'] });
  }

  async function reject(claimId: string) {
    const { error } = await supabase.rpc('reject_merchant_claim', { p_claim_id: claimId, p_reason: reason || null });
    if (error) return toast.error(error.message);
    toast.success('Claim rejected');
    setReason('');
    qc.invalidateQueries({ queryKey: ['admin-claims'] });
  }

  const pending = list.data?.filter((c: any) => c.status === 'pending') ?? [];
  const others = list.data?.filter((c: any) => c.status !== 'pending') ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Claim Requests</h1>
        <p className="text-sm text-muted-foreground">Merchants requesting ownership of an unclaimed listing.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pending ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
        {pending.map((c: any) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <Link to="/business/$id" params={{ id: c.merchants?.id }} target="_blank" className="flex items-center gap-2 hover:underline">
                  {c.merchants?.name || '(deleted business)'} <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <Badge className="bg-yellow-500/10 text-yellow-700 capitalize">{c.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-xs text-muted-foreground">
                {c.merchants?.address}{c.merchants?.city ? `, ${c.merchants.city}` : ''} · requested {new Date(c.created_at).toLocaleString()}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => approve(c.id)}>Approve</Button>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" variant="destructive">Reject</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Reject this claim</DialogTitle></DialogHeader>
                    <Textarea placeholder="Optional reason…" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                    <DialogFooter>
                      <Button variant="destructive" onClick={() => reject(c.id)}>Confirm rejection</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">History</h2>
        {others.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium">{c.merchants?.name || '(deleted business)'}</p>
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
              </div>
              <Badge variant="outline" className="capitalize">{c.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
