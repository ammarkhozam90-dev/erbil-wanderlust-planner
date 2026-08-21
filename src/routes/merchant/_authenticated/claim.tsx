import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, MapPin, Clock, CheckCircle2, Upload, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type ClaimSearch = {
  q?: string;
};

export const Route = createFileRoute('/merchant/_authenticated/claim')({
  validateSearch: (search: Record<string, unknown>): ClaimSearch => {
    return {
      q: (search.q as string) || '',
    };
  },
  component: ClaimBusiness,
});

function ClaimBusiness() {
  const { q: urlQ } = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState(urlQ || '');
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with URL if it changes
  useEffect(() => {
    if (urlQ) setQ(urlQ);
  }, [urlQ]);

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

  const myPending = useQuery({
    queryKey: ['my-pending-claims', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('merchant_claims').select('merchant_id').eq('requester_id', user!.id).eq('status', 'pending');
      return new Set((data ?? []).map((c: any) => c.merchant_id));
    },
  });

  async function submitClaim() {
    if (!user || !selectedMerchant) return;
    
    setSubmitting(true);
    try {
      let docUrl = null;
      
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('verification-docs')
          .upload(path, file);
        
        if (uploadError) throw uploadError;
        
        const { data: pub } = supabase.storage.from('verification-docs').getPublicUrl(path);
        docUrl = pub.publicUrl;
      }

      const { error } = await supabase.from('merchant_claims').insert({
        merchant_id: selectedMerchant.id,
        requester_id: user.id,
        verification_document_url: docUrl,
        status: 'pending'
      } as any);

      if (error) throw error;

      toast.success('Claim submitted — an admin will review it shortly.');
      setSelectedMerchant(null);
      setFile(null);
      qc.invalidateQueries({ queryKey: ['my-pending-claims', user.id] });
    } catch (err: any) {
      toast.error(err.message.includes('uq_one_pending') 
        ? 'This business already has a pending claim.' 
        : err.message);
    } finally {
      setSubmitting(false);
    }
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
                  <Button size="sm" onClick={() => setSelectedMerchant(m)}>
                    Claim this
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

      <Dialog open={!!selectedMerchant} onOpenChange={(open) => !open && setSelectedMerchant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim "{selectedMerchant?.name}"</DialogTitle>
            <DialogDescription>
              To verify your ownership, please upload a document (e.g., business license, utility bill, or official ID).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div 
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-gold/50 hover:bg-gold/5"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept="image/*,.pdf"
              />
              {file ? (
                <div className="flex items-center gap-2 text-gold">
                  <FileText className="h-8 w-8" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    Click to upload proof of ownership<br/>
                    <span className="text-xs">(Image or PDF)</span>
                  </p>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMerchant(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitClaim} disabled={submitting || !file}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
