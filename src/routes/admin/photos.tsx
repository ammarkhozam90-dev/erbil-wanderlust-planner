import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { logActivity } from '@/components/admin/log-activity';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export const Route = createFileRoute('/admin/photos')({ component: Photos });

type Filter = 'all' | 'approved' | 'pending' | 'recent';

function Photos() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const q = useQuery({
    queryKey: ['admin-photos', filter],
    queryFn: async () => {
      let query = supabase.from('merchant_photos')
        .select('id,url,caption,created_at,merchant_id, merchants(name,status,owner_id)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (filter === 'recent') {
        const week = new Date(Date.now() - 7 * 864e5).toISOString();
        query = query.gte('created_at', week);
      }
      const { data, error } = await query;
      if (error) throw error;
      let rows = data ?? [];
      if (filter === 'approved') rows = rows.filter((r: any) => r.merchants?.status === 'approved');
      if (filter === 'pending') rows = rows.filter((r: any) => r.merchants?.status === 'pending');
      return rows;
    },
  });

  const visibleRows = search.trim()
    ? q.data?.filter((r: any) => (r.merchants?.name ?? '').toLowerCase().includes(search.trim().toLowerCase()))
    : q.data;

  async function deletePhoto(row: any) {
    const path = extractPath(row.url);
    if (path) await supabase.storage.from('merchant-assets').remove([path]);
    const { error } = await supabase.from('merchant_photos').delete().eq('id', row.id);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'photo.deleted', target_type: 'photo', target_id: row.id, target_label: row.merchants?.name ?? '' });
    toast.success('Photo deleted'); qc.invalidateQueries({ queryKey: ['admin-photos'] });
  }

  async function setRole(row: any, kind: 'logo' | 'cover') {
    const payload = kind === 'logo' ? { logo_url: row.url } : { cover_url: row.url };
    const { error } = await supabase.from('merchants').update(payload as any).eq('id', row.merchant_id);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'photo.role_changed', target_type: 'merchant', target_id: row.merchant_id, target_label: row.merchants?.name ?? '', metadata: { role: kind } });
    toast.success(`Set as ${kind}`);
  }

  async function setAsGallery(row: any) {
    toast.success('Already in gallery');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Photo Moderation</h1>
          <p className="text-sm text-muted-foreground">Review, replace, or remove uploaded images. Newest first.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by business name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-8"
            />
          </div>
          <Select value={filter} onValueChange={(v: Filter) => setFilter(v)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All photos</SelectItem>
              <SelectItem value="approved">Approved businesses</SelectItem>
              <SelectItem value="pending">Pending businesses</SelectItem>
              <SelectItem value="recent">Recently uploaded (7d)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {q.isLoading && <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-56" /><Skeleton className="h-56" /><Skeleton className="h-56" /></div>}
      {!q.isLoading && visibleRows?.length === 0 && <p className="text-sm text-muted-foreground">No photos match this search/filter.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleRows?.map((row: any) => (
          <Card key={row.id}>
            <CardContent className="space-y-3 p-4">
              <img src={row.url} alt={row.caption ?? ''} className="h-48 w-full rounded object-cover" />
              <div className="text-sm">
                <div className="font-medium">{row.merchants?.name ?? '—'}</div>
                <div className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setRole(row, 'logo')}>Set logo</Button>
                <Button size="sm" variant="outline" onClick={() => setRole(row, 'cover')}>Set cover</Button>
                <Button size="sm" variant="outline" onClick={() => setAsGallery(row)}>Gallery</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="destructive">Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
                      <AlertDialogDescription>Removes the file from storage and the database record. Cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deletePhoto(row)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function extractPath(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/merchant-assets\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}
