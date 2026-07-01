import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { logActivity } from '@/components/admin/log-activity';

export const Route = createFileRoute('/admin/reports')({ component: Reports });

const STATUSES = ['open', 'in_progress', 'resolved'] as const;

function Reports() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => (await supabase.from('user_reports').select('*').order('created_at', { ascending: false })).data ?? [],
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from('user_reports').update({ status, updated_at: new Date().toISOString() } as any).eq('id', id);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'report.status_changed', target_type: 'report', target_id: id, metadata: { status } });
    qc.invalidateQueries({ queryKey: ['admin-reports'] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Issues reported by users. Future-ready — table works today.</p>
      </div>
      {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
      <div className="space-y-3">
        {list.data?.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.subject}</div>
                <Badge variant="outline" className="capitalize">{r.status.replace('_', ' ')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{r.message}</p>
              <div className="text-xs text-muted-foreground">{r.reporter_email} · {new Date(r.created_at).toLocaleString()}</div>
              <div className="flex gap-2">
                {STATUSES.filter((s) => s !== r.status).map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => setStatus(r.id, s)}>Mark {s.replace('_', ' ')}</Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
