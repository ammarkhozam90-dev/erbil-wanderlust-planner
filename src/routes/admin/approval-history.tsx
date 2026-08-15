import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Undo2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/approval-history')({ component: ApprovalHistory });

const ACTION_META: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive' },
  changes_requested: { label: 'Changes requested', color: 'bg-yellow-500/10 text-yellow-700' },
  reverted: { label: 'Reverted', color: 'bg-blue-500/10 text-blue-700' },
};

function ApprovalHistory() {
  const qc = useQueryClient();
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-approval-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_approval_history')
        .select('*, merchants(name, category)')
        .order('reviewed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function revert(id: string) {
    setRevertingId(id);
    const { error } = await supabase.rpc('revert_merchant_approval', { p_history_id: id });
    setRevertingId(null);
    if (error) return toast.error(error.message);
    toast.success('Approval reverted');
    qc.invalidateQueries({ queryKey: ['admin-approval-history'] });
    qc.invalidateQueries({ queryKey: ['admin-approvals'] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Approval History</h1>
        <p className="text-sm text-muted-foreground">
          Every decision made on merchant submissions. Approvals can be undone within 24 hours, as long as the listing hasn't been edited again since.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {rows?.map((h: any) => {
          const meta = ACTION_META[h.action] ?? { label: h.action, color: 'bg-muted' };
          const canRevert =
            h.action === 'approved' && !h.reverted_at && h.revertible_until && new Date(h.revertible_until) > new Date();
          return (
            <Card key={h.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                  <span>
                    {h.merchants?.name || '(deleted business)'}{' '}
                    <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">{h.merchants?.category}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge className={meta.color}>{meta.label}</Badge>
                    {h.reverted_at && <Badge className="bg-blue-500/10 text-blue-700">Since reverted</Badge>}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {new Date(h.reviewed_at).toLocaleString()}
                  {h.reason && <> — <span className="text-foreground">{h.reason}</span></>}
                </p>

                {h.changes && Object.keys(h.changes).length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What was in this decision</p>
                    <ul className="space-y-1 text-xs">
                      {Object.entries(h.changes).map(([field, value]: [string, any]) => {
                        if (typeof value === 'string') return <li key={field}><span className="font-medium">{field}:</span> {value}</li>;
                        if (value && 'old' in value && 'new' in value) {
                          const fmt = (v: any) => (typeof v === 'object' ? JSON.stringify(v) : v || '—');
                          return <li key={field}><span className="font-medium">{field}:</span> {fmt(value.old)} → {fmt(value.new)}</li>;
                        }
                        if (value && ('added' in value || 'removed' in value)) {
                          return (
                            <li key={field}>
                              <span className="font-medium">{field}:</span>{' '}
                              {value.added?.length > 0 && <span className="text-green-600">+ {value.added.join(', ')}</span>}{' '}
                              {value.removed?.length > 0 && <span className="text-destructive">− {value.removed.join(', ')}</span>}
                            </li>
                          );
                        }
                        return null;
                      })}
                    </ul>
                  </div>
                )}

                {canRevert && (
                  <Button size="sm" variant="outline" disabled={revertingId === h.id} onClick={() => revert(h.id)}>
                    {revertingId === h.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Undo2 className="mr-2 h-3.5 w-3.5" />}
                    Undo this approval
                  </Button>
                )}
                {h.action === 'approved' && !h.reverted_at && !canRevert && !h.revertible_until && (
                  <p className="text-[11px] text-muted-foreground">
                    Not auto-revertible (this decision only involved photos or opening-hours changes — review manually if needed).
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {rows?.length === 0 && <p className="text-sm text-muted-foreground">No decisions yet.</p>}
      </div>
    </div>
  );
}
