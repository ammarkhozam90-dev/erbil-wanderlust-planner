import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { logActivity } from '@/components/admin/log-activity';

export const Route = createFileRoute('/admin/users')({ component: Users });

function Users() {
  const qc = useQueryClient();
  const { user: current } = useAuth();

  const roles = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: r } = await supabase.from('user_roles').select('user_id,role,created_at');
      const ids = Array.from(new Set((r ?? []).map((x: any) => x.user_id)));
      const { data: merchants } = await supabase.from('merchants')
        .select('owner_id,name,status,is_suspended')
        .in('owner_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      const byUser: Record<string, any> = {};
      (r ?? []).forEach((x: any) => {
        byUser[x.user_id] = byUser[x.user_id] || { user_id: x.user_id, roles: [], merchants: [] };
        byUser[x.user_id].roles.push(x.role);
      });
      (merchants ?? []).forEach((m: any) => {
        byUser[m.owner_id] = byUser[m.owner_id] || { user_id: m.owner_id, roles: [], merchants: [] };
        byUser[m.owner_id].merchants.push(m);
      });
      return Object.values(byUser);
    },
  });

  async function suspend(u: any, suspended: boolean) {
    const ids = u.merchants.map((m: any) => m.id).filter(Boolean);
    if (!u.merchants.length) return toast.error('No merchant record to update');
    const { error } = await supabase.from('merchants').update({ is_suspended: suspended } as any).eq('owner_id', u.user_id);
    if (error) return toast.error(error.message);
    await logActivity({ action: suspended ? 'merchant.suspended' : 'merchant.reactivated', target_type: 'user', target_id: u.user_id });
    toast.success(suspended ? 'Suspended' : 'Reactivated');
    qc.invalidateQueries({ queryKey: ['admin-users'] });
  }

  async function resetStatus(u: any) {
    const { error } = await supabase.from('merchants').update({ status: 'draft', rejection_reason: null } as any).eq('owner_id', u.user_id);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'merchant.status_reset', target_type: 'user', target_id: u.user_id });
    toast.success('Status reset to draft');
    qc.invalidateQueries({ queryKey: ['admin-users'] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">Merchants and admins.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.data?.map((u: any) => {
                const isSelf = u.user_id === current?.id;
                const m = u.merchants[0];
                return (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-mono text-xs">{u.user_id.slice(0, 8)}…</TableCell>
                    <TableCell>{u.roles.map((r: string) => <Badge key={r} variant="outline" className="mr-1 capitalize">{r}</Badge>)}</TableCell>
                    <TableCell>{m?.name ?? '—'}</TableCell>
                    <TableCell>
                      {m ? (
                        <Badge variant="outline" className="capitalize">
                          {m.is_suspended ? 'suspended' : m.status}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      {m && !m.is_suspended && <Button size="sm" variant="outline" disabled={isSelf} onClick={() => suspend(u, true)}>Suspend</Button>}
                      {m && m.is_suspended && <Button size="sm" variant="outline" onClick={() => suspend(u, false)}>Reactivate</Button>}
                      {m && <Button size="sm" variant="outline" onClick={() => resetStatus(u)}>Reset status</Button>}
                      {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
