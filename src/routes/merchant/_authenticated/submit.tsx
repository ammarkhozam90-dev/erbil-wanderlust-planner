import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyMerchant } from '@/components/merchant/use-my-merchant';
import { useMerchantContext } from '@/components/merchant/merchant-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Rocket } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/merchant/_authenticated/submit')({
  component: Submit,
});

function Submit() {
  const { user } = useAuth();
  const { refetch } = useMerchantContext();
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
    refetch();
    navigate({ to: '/merchant/dashboard' });
  }

  // A listing that's already approved and hasn't been edited since (the DB
  // trigger flips this back to 'pending' the moment real content changes)
  // has nothing left to "submit" — show its live status instead of the
  // checklist + button every time.
  if (m.status === 'approved') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h2 className="font-display text-2xl font-bold">Submit for Review</h2>
        <Card className="border-green-600/30 bg-green-600/5">
          <CardContent className="flex items-center gap-3 py-6">
            <Rocket className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold">Your listing is live</p>
              <p className="text-sm text-muted-foreground">
                Editing your business details, photos, hours, or tags will automatically send it back for review.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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

      <Button size="lg" className="w-full" disabled={!ready || submitting || m.status === 'pending'} onClick={submit}>
        {submitting ? 'Submitting…' : m.status === 'pending' ? 'Already submitted' : 'Submit for review'}
      </Button>
      {!ready && <p className="text-center text-xs text-muted-foreground">Complete all items above to submit.</p>}
    </div>
  );
}
