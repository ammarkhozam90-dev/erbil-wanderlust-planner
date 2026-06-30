import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyMerchant } from '@/components/merchant/use-my-merchant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/merchant/_authenticated/submit')({
  component: Submit,
});

function Submit() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: m } = useMyMerchant(user?.id);
  const [submitting, setSubmitting] = useState(false);

  if (!m) return <div className="text-muted-foreground">Set up your business first.</div>;

  const checks = [
    { ok: !!m.name, label: 'Business name set' },
    { ok: !!m.description, label: 'Description added' },
    { ok: m.latitude != null && m.longitude != null, label: 'Location pinned on map' },
    { ok: !!m.logo_url, label: 'Logo uploaded' },
    { ok: !!m.cover_url, label: 'Cover image uploaded' },
    { ok: (m.features ?? []).length > 0, label: 'At least one feature selected' },
    { ok: (m.mood_tags ?? []).length > 0, label: 'AI planning mood tags set' },
  ];
  const ready = checks.every((c) => c.ok);

  async function submit() {
    setSubmitting(true);
    const { error } = await supabase
      .from('merchants')
      .update({ status: 'pending', submitted_at: new Date().toISOString(), rejection_reason: null })
      .eq('id', m!.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Submitted for review!');
    qc.invalidateQueries({ queryKey: ['my-merchant', user?.id] });
    navigate({ to: '/merchant/dashboard' });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="font-display text-2xl font-bold">Submit for Review</h2>

      {m.status === 'pending' && (
        <Alert>
          <AlertTitle>Already pending</AlertTitle>
          <AlertDescription>Your listing is awaiting admin approval.</AlertDescription>
        </Alert>
      )}

      {m.status === 'rejected' && (
        <Alert variant="destructive">
          <AlertTitle>Previously rejected</AlertTitle>
          <AlertDescription>{m.rejection_reason || 'No reason provided. Update your listing and resubmit.'}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Readiness checklist</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-sm">
              {c.ok
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <AlertCircle className="h-4 w-4 text-destructive" />}
              <span className={c.ok ? '' : 'text-muted-foreground'}>{c.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" disabled={!ready || submitting} onClick={submit}>
        {submitting ? 'Submitting…' : 'Submit for review'}
      </Button>
      {!ready && <p className="text-center text-xs text-muted-foreground">Complete all items above to submit.</p>}
    </div>
  );
}
