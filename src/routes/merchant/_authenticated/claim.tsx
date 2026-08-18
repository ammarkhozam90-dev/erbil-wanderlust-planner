import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/merchant/_authenticated/claim')({
  component: ClaimBusiness,
});

function ClaimBusiness() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const results = useQuery({
    queryKey: ['unclaimed-search', q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const safe = q.trim().replace(/[%,]/g, ' ');
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('claim_status', 'unclaimed')
        .eq('status', 'approved')
        .or(`name.ilike.%${safe}%,address.ilike.%${safe}%,phone.ilike.%${safe}%`)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Claims this merchant already has pending, so we can show "Pending" instead of the button again.
  const myPending = useQuery({
    queryKey: ['my-pending-claims', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('merchant_claims').select('merchant_id').eq('requester_id', user!.id).eq('status', 'pending');
      return new Set((data ?? []).map((c: any) => c.merchant_id));
    },
  });

  async function claim(merchantId: string) {
    if (!user) return;
    setClaimingId(merchantId);
    const { error } = await supabase.from('merchant_claims').insert({ merchant_id: merchantId, requester_id: user.id } as any);
    setClaimingId(null);
    if (error) {
      toast.error(error.message.includes('duplicate') || error.message.includes('uq_one_pending')
        ? 'This business already has a pending claim.'
        : error.message);
      return;
    }
    toast.success('Claim submitted — an admin will review it shortly.');
    qc.invalidateQueries({ queryKey: ['my-pending-claims', user.id] });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Find &amp; Claim Your Business</h2>
        <p className="text-sm text-muted-foreground">
          ErbilGo may already have your business listed. Search by name, address, or phone to check.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your business name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {q.trim().length >= 2 && results.isLoading && (
        <p className="text-sm text-muted-foreground">Searching…</p>
      )}

      {q.trim().length >= 2 && !results.isLoading && results.data?.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No unclaimed listing found for "{q}". You can create a brand-new business instead from the sidebar.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {results.data?.map((m: any) => {
          const isPending = myPending.data?.has(m.id);
          return (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{(m.categories?.length ? m.categories : [m.category]).join(' · ')}</p>
                  {m.address && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> {m.address}
                    </p>
                  )}
                </div>
                {isPending ? (
                  <Badge className="shrink-0 bg-yellow-500/10 text-yellow-700"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>
                ) : (
                  <Button size="sm" onClick={() => claim(m.id)} disabled={claimingId === m.id}>
                    {claimingId === m.id ? '…' : 'Claim this'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
          Can't find your business? Head to <span className="font-medium text-foreground">My Business</span> in the sidebar to add it from scratch.
        </CardContent>
      </Card>
    </div>
  );
}
