import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export const Route = createFileRoute('/admin/activity')({ component: Activity });

function Activity() {
  const q = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => (await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200)).data ?? [],
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Activity Log</h1>
        <p className="text-sm text-muted-foreground">Last 200 admin actions.</p>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data?.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{a.actor_email ?? a.actor_id?.slice(0, 8)}</TableCell>
                <TableCell className="font-mono text-xs">{a.action}</TableCell>
                <TableCell className="text-xs">{a.target_label ?? a.target_type ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
