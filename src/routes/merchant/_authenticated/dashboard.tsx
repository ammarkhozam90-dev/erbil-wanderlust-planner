import { createFileRoute, Link } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { useMyMerchant } from '@/components/merchant/use-my-merchant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertCircle, FileEdit } from 'lucide-react';

export const Route = createFileRoute('/merchant/_authenticated/dashboard')({
  component: Dashboard,
});

const statusMeta = {
  draft: { label: 'Draft', icon: FileEdit, color: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pending Review', icon: Clock, color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  approved: { label: 'Approved & Live', icon: CheckCircle2, color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  rejected: { label: 'Rejected', icon: AlertCircle, color: 'bg-destructive/10 text-destructive' },
} as const;

function Dashboard() {
  const { user } = useAuth();
  const { data: merchant, isLoading } = useMyMerchant(user?.id);

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  const status = merchant?.status ?? 'draft';
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold">Welcome back</h2>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Listing status</span>
            <Badge className={meta.color}>
              <Icon className="mr-1 h-3 w-3" /> {meta.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!merchant && (
            <>
              <p className="text-sm text-muted-foreground">You haven't set up your business yet.</p>
              <Button asChild>
                <Link to="/merchant/my-business">Start setup</Link>
              </Button>
            </>
          )}
          {merchant && status === 'draft' && (
            <>
              <p className="text-sm text-muted-foreground">
                Complete your profile across the sidebar steps, then submit for review.
              </p>
              <Button asChild>
                <Link to="/merchant/my-business">Continue editing</Link>
              </Button>
            </>
          )}
          {merchant && status === 'pending' && (
            <p className="text-sm text-muted-foreground">
              Your submission is being reviewed. You'll be notified once a decision is made.
            </p>
          )}
          {merchant && status === 'approved' && (
            <p className="text-sm text-muted-foreground">
              Your listing is live. Editing key fields will re-trigger review.
            </p>
          )}
          {merchant && status === 'rejected' && (
            <>
              <p className="text-sm text-muted-foreground">Reason: {merchant.rejection_reason ?? '—'}</p>
              <Button asChild>
                <Link to="/merchant/my-business">Update & resubmit</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Business</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{merchant?.name || '—'}</div>
            <div className="text-sm text-muted-foreground capitalize">{merchant?.category}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Features</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{merchant?.features?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">selected</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Mood tags</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{merchant?.mood_tags?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">configured</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
