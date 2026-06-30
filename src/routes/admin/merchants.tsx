import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Merchant } from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/admin/merchants')({
  component: AdminMerchants,
});

function AdminMerchants() {
  const { user, loading, isAdmin } = useAuth(); // استخدام isAdmin المباشر من الـ hook
  const qc = useQueryClient();

  // قمنا بإزالة useEffect المعقدة والاعتماد على isAdmin من الـ Auth Hook مباشرة
  const mq = useQuery({
    queryKey: ['admin-merchants'],
    enabled: !!user, // التأكد فقط من تسجيل الدخول
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('submitted_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Merchant[];
    },
  });

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!user) return <div className="p-8">Please sign in.</div>;
  
  // إذا كانت الـ isAdmin ترجع false دائماً، تأكد من التعديل في hook الـ auth
  if (!isAdmin) return <div className="p-8 text-destructive">Admin access required.</div>;

  async function approve(id: string) {
    const { error } = await supabase.from('merchants')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user!.id, rejection_reason: null })
      .eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Merchant approved successfully');
    qc.invalidateQueries({ queryKey: ['admin-merchants'] });
  }

  async function reject(id: string, reason: string) {
    if (!reason.trim()) return toast.error('Please enter a reason for rejection');
    const { error } = await supabase.from('merchants')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user!.id, rejection_reason: reason })
      .eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Merchant rejected');
    qc.invalidateQueries({ queryKey: ['admin-merchants'] });
  }

  const pending = mq.data?.filter((m) => m.status === 'pending') ?? [];
  const others = mq.data?.filter((m) => m.status !== 'pending') ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Review and manage merchant applications.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-yellow-600">Pending Review ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted-foreground italic">No pending submissions found.</p>}
        <div className="grid gap-4">
          {pending.map((m) => <MerchantRow key={m.id} m={m} onApprove={approve} onReject={reject} />)}
        </div>
      </section>

      <section className="space-y-4 pt-8">
        <h2 className="text-xl font-semibold">Previous Decisions</h2>
        <div className="grid gap-4 opacity-80">
          {others.map((m) => <MerchantRow key={m.id} m={m} onApprove={approve} onReject={reject} compact />)}
        </div>
      </section>
    </div>
  );
}

function MerchantRow({ m, onApprove, onReject, compact }: {
  m: Merchant; onApprove: (id: string) => void; onReject: (id: string, r: string) => void; compact?: boolean;
}) {
  const [reason, setReason] = useState('');
  
  return (
    <Card className={m.status === 'rejected' ? 'bg-red-50/50' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          {m.name || 'Unnamed Merchant'}
          <Badge variant={m.status === 'approved' ? 'default' : m.status === 'rejected' ? 'destructive' : 'secondary'}>
            {m.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!compact && <p className="text-sm text-muted-foreground">{m.description || 'No description provided.'}</p>}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>📍 {m.address}</span>
          <span>📞 {m.phone}</span>
        </div>
        
        {m.status === 'pending' && (
          <div className="mt-4 flex flex-col gap-3 rounded-md border p-3">
            <Textarea placeholder="Rejection reason (required if rejecting)..." value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => onApprove(m.id)}>Approve</Button>
              <Button className="flex-1" variant="destructive" onClick={() => onReject(m.id, reason)}>Reject</Button>
            </div>
          </div>
        )}
        {m.status === 'rejected' && m.rejection_reason && (
          <p className="text-xs text-red-600 font-medium">Rejection Reason: {m.rejection_reason}</p>
        )}
      </CardContent>
    </Card>
  );
}
