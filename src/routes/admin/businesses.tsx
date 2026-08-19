import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { logActivity } from '@/components/admin/log-activity';
import { Pencil } from 'lucide-react';
import type { Merchant } from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/admin/businesses')({ component: Businesses });

const PAGE = 20;

function Businesses() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);

  const list = useQuery({
    queryKey: ['admin-businesses', q, page],
    queryFn: async () => {
      let query = supabase.from('merchants')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as Merchant[], count: count ?? 0 };
    },
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil((list.data?.count ?? 0) / PAGE)), [list.data?.count]);

  async function approve(m: Merchant) {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from('merchants').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: u.user?.id, rejection_reason: null }).eq('id', m.id);
    await logActivity({ action: 'business.approved', target_type: 'merchant', target_id: m.id, target_label: m.name });
    toast.success('Approved'); qc.invalidateQueries({ queryKey: ['admin-businesses'] });
  }
  async function reject(m: Merchant) {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from('merchants').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: u.user?.id, rejection_reason: 'Rejected from businesses table' }).eq('id', m.id);
    await logActivity({ action: 'business.rejected', target_type: 'merchant', target_id: m.id, target_label: m.name });
    toast.success('Rejected'); qc.invalidateQueries({ queryKey: ['admin-businesses'] });
  }
  async function remove(m: Merchant) {
    // Delete storage assets referenced by photos (correct bucket: merchant-media)
    const { data: photos } = await supabase.from('merchant_photos').select('url').eq('merchant_id', m.id);
    const paths = (photos ?? []).map((p: any) => extractPath(p.url)).filter(Boolean) as string[];
    if (m.logo_url) { const p = extractPath(m.logo_url); if (p) paths.push(p); }
    if (m.cover_url) { const p = extractPath(m.cover_url); if (p) paths.push(p); }
    if (paths.length) {
      const { error: storageErr } = await supabase.storage.from('merchant-media').remove(paths);
      if (storageErr) console.error('Storage cleanup error:', storageErr.message);
    }
    // Delete every row in every table that references this merchant, in an
    // order that respects foreign keys, BEFORE deleting the merchant row
    // itself — otherwise the final delete fails silently-to-the-user
    // whenever the business has any history (e.g. was ever approved,
    // rejected, or had a claim request).
    await supabase.from('merchant_photos').delete().eq('merchant_id', m.id);
    await supabase.from('merchant_hours').delete().eq('merchant_id', m.id);
    await supabase.from('merchant_approval_history').delete().eq('merchant_id', m.id);
    await supabase.from('merchant_claims').delete().eq('merchant_id', m.id);

    const { error } = await supabase.from('merchants').delete().eq('id', m.id);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'business.deleted', target_type: 'merchant', target_id: m.id, target_label: m.name });
    toast.success('Deleted');
    qc.invalidateQueries({ queryKey: ['admin-businesses'] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Businesses</h1>
          <p className="text-sm text-muted-foreground">{list.data?.count ?? 0} total</p>
        </div>
        <Input placeholder="Search by name…" value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} className="max-w-xs" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading && Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))}
              {list.data?.rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name || '—'}</TableCell>
                  <TableCell className="capitalize">{m.category}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{m.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(m.created_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {fmt(m.updated_at)}
                      {wasEdited(m.created_at, m.updated_at) && (
                        <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15">Edited</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button asChild size="sm" variant="outline"><Link to="/admin/business-edit/$id" params={{ id: m.id }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Link></Button>
                    <Button size="sm" variant="outline" onClick={() => approve(m)}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => reject(m)}>Reject</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="destructive">Delete</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{m.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>This removes the business, all photos (including storage files), opening hours, approval history, and claim requests. This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(m)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
        <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}

function fmt(d?: string | null) { return d ? new Date(d).toLocaleDateString() : '—'; }

// A row counts as "Edited" once its updated_at is more than a few seconds
// past its created_at — small buffer avoids false positives from the
// original insert's own timestamp rounding.
function wasEdited(created?: string | null, updated?: string | null): boolean {
  if (!created || !updated) return false;
  const diffMs = new Date(updated).getTime() - new Date(created).getTime();
  return diffMs > 5000;
}

function extractPath(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/merchant-media\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}
