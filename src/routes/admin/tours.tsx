import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Tour } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/admin/tours')({ ssr: false, component: AdminTours });

function AdminTours() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: '/' }); return; }
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => {
        const ok = !!data;
        setIsAdmin(ok);
        if (!ok) { toast.error('Access Denied'); nav({ to: '/' }); }
      });
  }, [user, loading]);

  async function reload() {
    const { data } = await supabase.from('tours').select('*').order('submitted_at', { ascending: false });
    setTours((data ?? []) as Tour[]);
  }
  useEffect(() => { if (isAdmin) reload(); }, [isAdmin]);

  async function approve(id: string) {
    await supabase.from('tours').update({
      status: 'approved', reviewed_at: new Date().toISOString(),
      reviewed_by: user!.id, rejection_reason: null,
    }).eq('id', id);
    reload();
  }
  async function reject(id: string) {
    if (!reason) return toast.error('Provide a reason first');
    await supabase.from('tours').update({
      status: 'rejected', reviewed_at: new Date().toISOString(),
      reviewed_by: user!.id, rejection_reason: reason,
    }).eq('id', id);
    setReason('');
    reload();
  }
  async function del(id: string) {
    if (!confirm('Delete this tour permanently?')) return;
    await supabase.from('tours').delete().eq('id', id);
    reload();
  }
  async function suspendOrganizer(organizerId: string) {
    if (!confirm('Suspend this organizer?')) return;
    await supabase.from('tour_organizers').update({ is_suspended: true }).eq('id', organizerId);
    toast.success('Organizer suspended');
  }

  if (isAdmin === null) return <div className="p-8">Loading…</div>;

  const groups = {
    pending: tours.filter((t) => t.status === 'pending'),
    approved: tours.filter((t) => t.status === 'approved'),
    rejected: tours.filter((t) => t.status === 'rejected'),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-bold">Tour Management</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {(['pending','approved','rejected'] as const).map((k) => (
          <Card key={k}><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{k[0].toUpperCase()+k.slice(1)}</p>
            <p className="text-3xl font-bold">{groups[k].length}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        {(['pending','approved','rejected'] as const).map((k) => (
          <TabsContent key={k} value={k} className="space-y-3">
            {k === 'pending' && (
              <Textarea placeholder="Rejection reason (used when rejecting)" value={reason} onChange={(e) => setReason(e.target.value)} />
            )}
            {groups[k].map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <Badge>{t.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{t.short_description}</p>
                  <p className="text-xs text-muted-foreground">{t.destination} • {t.category}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {t.status !== 'approved' && <Button size="sm" onClick={() => approve(t.id)}>Approve</Button>}
                    {t.status !== 'rejected' && <Button size="sm" variant="destructive" onClick={() => reject(t.id)}>Reject</Button>}
                    <Button size="sm" variant="outline" onClick={() => suspendOrganizer(t.organizer_id)}>Suspend organizer</Button>
                    <Button size="sm" variant="ghost" onClick={() => del(t.id)}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {groups[k].length === 0 && <p className="text-muted-foreground">No tours here.</p>}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
