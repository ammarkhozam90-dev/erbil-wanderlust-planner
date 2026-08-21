import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Building2, CheckCircle2, ChevronRight, Link2, Link2Off, MapPin, Plus, Sparkles, Store,
} from 'lucide-react';
import { useMerchantContext } from '@/components/merchant/merchant-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Merchant } from '@/integrations/supabase/types-local';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/merchant/_authenticated/branches')({ component: Branches });

type BranchGroup = { id: string; name: string; branches: Merchant[] };

function Branches() {
  const navigate = useNavigate();
  const {
    merchants,
    isLoading,
    currentMerchant,
    setCurrentMerchantId,
    createBusiness,
    linkAsBranch,
    unlinkBranch,
  } = useMerchantContext();
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLabel, setNewBranchLabel] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const groups = useMemo<BranchGroup[]>(() => {
    const grouped = new Map<string, Merchant[]>();
    merchants.forEach((merchant) => {
      const groupId = (merchant as any).brand_group_id || `solo-${merchant.id}`;
      grouped.set(groupId, [...(grouped.get(groupId) ?? []), merchant]);
    });
    return Array.from(grouped.entries()).map(([id, branches]) => {
      const main = branches.find((branch) => (branch as any).is_main_branch) ?? branches[0];
      return { id, name: main?.name || 'Untitled brand', branches };
    });
  }, [merchants]);

  const linkCandidates = merchants.filter((merchant) => {
    if (!currentMerchant) return true;
    return merchant.id !== currentMerchant.id && (merchant as any).brand_group_id !== (currentMerchant as any).brand_group_id;
  });
  const totalLocations = merchants.length;
  const connectedLocations = groups.filter((group) => group.branches.length > 1).reduce((count, group) => count + group.branches.length, 0);
  const draftCount = merchants.filter((merchant) => (merchant as any).status === 'draft').length;

  async function handleLink() {
    if (!currentMerchant || !linkTargetId) return;
    setBusyAction('link');
    try {
      await linkAsBranch(currentMerchant.id, linkTargetId, linkLabel.trim() || undefined);
      toast.success('Location linked to your brand');
      setLinkTargetId('');
      setLinkLabel('');
    } catch (error: any) {
      toast.error(error?.message ?? 'Could not link this location');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateBranch() {
    if (!currentMerchant || !newBranchName.trim()) return;
    setBusyAction('create');
    try {
      const created = await createBusiness(newBranchName.trim(), currentMerchant);
      await linkAsBranch(currentMerchant.id, created.id, newBranchLabel.trim() || undefined);
      setCurrentMerchantId(currentMerchant.id);
      toast.success('New branch created and connected');
      setNewBranchName('');
      setNewBranchLabel('');
    } catch (error: any) {
      toast.error(error?.message ?? 'Could not create this branch');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUnlink(branchId: string) {
    setBusyAction(`unlink-${branchId}`);
    try {
      await unlinkBranch(branchId);
      toast.success('Location disconnected from this brand');
    } catch (error: any) {
      toast.error(error?.message ?? 'Could not disconnect this location');
    } finally {
      setBusyAction(null);
    }
  }

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading your locations…</div>;

  if (!currentMerchant || merchants.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gold/10 text-gold"><Building2 className="h-8 w-8" /></div>
        <h1 className="mt-6 font-display text-3xl font-bold">Your locations will appear here</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Create or claim your first business listing, then manage every location under one clear brand workspace.</p>
        <Button className="mt-6 bg-gold text-background hover:bg-gold/90" onClick={() => navigate({ to: '/merchant/dashboard' })}>Start with your business <ChevronRight className="ml-2 h-4 w-4" /></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/15 via-card to-card p-7 shadow-luxury md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-background/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gold"><Sparkles className="h-3.5 w-3.5" /> Brand workspace</div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">One brand. Every location.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Keep your identity consistent while giving each branch its own address, hours, photos, and customer journey.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total locations" value={totalLocations} icon={<Store className="h-4 w-4" />} />
        <StatCard label="Connected branches" value={connectedLocations} icon={<Link2 className="h-4 w-4" />} />
        <StatCard label="Draft listings" value={draftCount} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">Your portfolio</p>
          <h2 className="mt-1 font-display text-2xl font-bold">Connected locations</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id} className="overflow-hidden border-border/80 bg-card/70">
              <CardHeader className="border-b border-border/60 bg-background/20 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-gold" /><CardTitle>{group.name}</CardTitle></div>
                    <p className="mt-1 text-xs text-muted-foreground">{group.branches.length} {group.branches.length === 1 ? 'location' : 'locations'} under this brand</p>
                  </div>
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[10px] font-semibold text-gold">{group.branches.length > 1 ? 'Connected' : 'Standalone'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {group.branches.map((branch) => {
                  const isMain = !!(branch as any).is_main_branch;
                  const isCurrent = branch.id === currentMerchant.id;
                  return (
                    <div key={branch.id} className={cn('rounded-xl border p-4 transition-colors', isCurrent ? 'border-gold/50 bg-gold/5' : 'border-border bg-background/30')}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{branch.name || 'Untitled location'}</p>{isMain && <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">Main</span>}</div>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{(branch as any).branch_label || (branch as any).city || 'Location details not added yet'}</p>
                        </div>
                        {isCurrent && <span className="shrink-0 rounded-full bg-gold px-2 py-1 text-[10px] font-bold text-background">Selected</span>}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant={isCurrent ? 'secondary' : 'default'} onClick={() => { setCurrentMerchantId(branch.id); navigate({ to: '/merchant/my-business' }); }}>
                          Manage location <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                        {!isMain && group.branches.length > 1 && (
                          <Button size="sm" variant="outline" onClick={() => handleUnlink(branch.id)} disabled={busyAction === `unlink-${branch.id}`}>
                            <Link2Off className="mr-1.5 h-3.5 w-3.5" />{busyAction === `unlink-${branch.id}` ? 'Disconnecting…' : 'Disconnect'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="border-gold/20 bg-gold/5">
          <CardHeader><div className="flex items-center gap-2"><Link2 className="h-5 w-5 text-gold" /><CardTitle>Connect an existing listing</CardTitle></div><p className="text-sm text-muted-foreground">Link another listing you already own to the selected brand.</p></CardHeader>
          <CardContent className="space-y-4">
            {linkCandidates.length > 0 ? <>
              <div className="space-y-2"><Label>Listing</Label><Select value={linkTargetId} onValueChange={setLinkTargetId}><SelectTrigger><SelectValue placeholder="Choose a listing…" /></SelectTrigger><SelectContent>{linkCandidates.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name || 'Untitled listing'}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Location label <span className="font-normal text-muted-foreground">(optional)</span></Label><Input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="e.g. Ankawa branch" /></div>
              <Button onClick={handleLink} disabled={!linkTargetId || busyAction === 'link'} className="w-full bg-gold text-background hover:bg-gold/90">{busyAction === 'link' ? 'Connecting…' : 'Connect listing'}</Button>
            </> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">You have no other unconnected listings. Create a new branch instead.</p>}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader><div className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-500" /><CardTitle>Create a new branch</CardTitle></div><p className="text-sm text-muted-foreground">Shared brand content is copied. Add the branch-specific location details afterwards.</p></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Branch name</Label><Input value={newBranchName} onChange={(event) => setNewBranchName(event.target.value)} placeholder="e.g. ErbilGo Cafe — Empire" /></div>
            <div className="space-y-2"><Label>Location label <span className="font-normal text-muted-foreground">(optional)</span></Label><Input value={newBranchLabel} onChange={(event) => setNewBranchLabel(event.target.value)} placeholder="e.g. Empire World branch" /></div>
            <Button onClick={handleCreateBranch} disabled={!newBranchName.trim() || busyAction === 'create'} className="w-full bg-emerald-500 text-white hover:bg-emerald-600">{busyAction === 'create' ? 'Creating…' : 'Create and connect branch'}</Button>
          </CardContent>
        </Card>
      </section>

      <p className="text-center text-xs text-muted-foreground">Each location can have its own map pin, hours, gallery, and contact details while your brand remains connected.</p>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <Card className="bg-card/60"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div><div className="grid h-10 w-10 place-items-center rounded-full bg-gold/10 text-gold">{icon}</div></CardContent></Card>;
}

