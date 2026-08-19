import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link2, Link2Off, Plus } from 'lucide-react';
import type { BusinessCategory } from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/merchant/_authenticated/my-business')({
  component: MyBusiness,
});

const CATEGORIES: BusinessCategory[] = ['restaurant', 'cafe', 'hotel', 'attraction', 'shop', 'activity', 'other'];

function MyBusiness() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: m, isLoading } = useMyMerchant(user?.id);
  const { merchants, branchSiblings, linkAsBranch, unlinkBranch, createBusiness, setCurrentMerchantId } = useMerchantContext();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [linkTargetId, setLinkTargetId] = useState<string>('');
  const [branchLabel, setBranchLabel] = useState('');
  const [linking, setLinking] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLabel, setNewBranchLabel] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);

  useEffect(() => {
    if (!m && user?.email && user?.id && !isLoading) {
      ensureMerchant(user.id, user.email).then(() =>
        qc.invalidateQueries({ queryKey: ['my-merchant', user.id] }),
      );
    }
    if (m && !form) {
      setForm({ ...m, categories: (m as any).categories?.length ? (m as any).categories : [m.category] });
    }
  }, [m, user, isLoading, qc, form]);

  if (isLoading || !form) return <div className="text-muted-foreground">Loading…</div>;

  function update<K extends string>(key: K, value: unknown) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function toggleCategory(c: BusinessCategory) {
    setForm((f: any) => {
      const current: BusinessCategory[] = f.categories ?? [];
      if (current.includes(c)) {
        if (current.length === 1) return f; // keep at least one category selected
        return { ...f, categories: current.filter((x) => x !== c) };
      }
      return { ...f, categories: [...current, c] };
    });
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('merchants')
      .update({
        name: form.name, categories: form.categories, description: form.description,
        phone: form.phone, email: form.email, website: form.website,
        address: form.address, city: form.city,
        latitude: form.latitude, longitude: form.longitude,
        instagram: form.instagram, facebook: form.facebook,
        tiktok: form.tiktok, whatsapp: form.whatsapp,
      } as any)
      .eq('id', form.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    qc.invalidateQueries({ queryKey: ['my-merchant', user?.id] });
  }

  // Other businesses this account owns that aren't already this business's
  // branch group — candidates to link as a branch.
  const linkCandidates = merchants.filter(
    (x) => x.id !== form.id && (x as any).brand_group_id !== (form as any).brand_group_id,
  );

  async function handleLink() {
    if (!linkTargetId) return;
    setLinking(true);
    try {
      // form.id becomes (or stays) the main branch; linkTargetId joins its group.
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

  // Creates a brand-new business under this account and immediately links
  // it as a branch of the current one — covers the common case where a
  // merchant doesn't have a second business yet to link.
  async function handleCreateBranch() {
    if (!newBranchName.trim()) return toast.error('Enter a name for the new branch');
    setCreatingBranch(true);
    try {
      const created = await createBusiness(newBranchName.trim());
      // createBusiness() switches the active business to the new one —
      // switch back to the one we're linking from before continuing.
      setCurrentMerchantId(form.id);
      await linkAsBranch(form.id, created.id, newBranchLabel || undefined);
      toast.success('New branch created and linked — fill in its details from the business switcher.');
      setNewBranchName('');
      setNewBranchLabel('');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not create branch');
    } finally {
      setCreatingBranch(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">My Business</h2>
          <p className="text-sm text-muted-foreground">Basic info, location & socials.</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Basic info</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Business name</Label>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Categories</Label>
            <p className="text-xs text-muted-foreground">Select every category that applies — e.g. a hotel with its own restaurant and cafe.</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = (form.categories ?? []).includes(c);
                return (
                  <button key={c} type="button" onClick={() => toggleCategory(c)}>
                    <Badge
                      variant={active ? 'default' : 'outline'}
                      className={cn('cursor-pointer px-3 py-1.5 text-sm capitalize', active && 'bg-primary')}
                    >
                      {c}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contact email</Label>
            <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => update('website', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Click on the map or drag the pin to set the exact location.</p>
          <MapPicker
            lat={form.latitude}
            lng={form.longitude}
            onChange={(lat, lng) => setForm((f: any) => ({ ...f, latitude: lat, longitude: lng }))}
          />
          {form.latitude != null && (
            <p className="text-xs text-muted-foreground">
              {form.latitude.toFixed(5)}, {form.longitude?.toFixed(5)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Social media</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(['instagram', 'facebook', 'tiktok', 'whatsapp'] as const).map((k) => (
            <div key={k} className="space-y-2">
              <Label className="capitalize">{k}</Label>
              <Input value={form[k]} onChange={(e) => update(k, e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
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
                  <Button size="sm" variant="outline" onClick={() => handleUnlink(s.id)}>
                    <Link2Off className="mr-1.5 h-3.5 w-3.5" /> Unlink
                  </Button>
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
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </div>
  );
}
