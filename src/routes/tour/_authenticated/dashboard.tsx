import { createFileRoute, Link } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';
import { useMyTours } from '@/components/tour/use-tours';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/tour/_authenticated/dashboard')({ component: Dashboard });

function Dashboard() {
  const { user } = useAuth();
  const { data: org } = useMyOrganizer(user?.id);
  const { data: tours = [] } = useMyTours(org?.id);
  const count = (s: string) => tours.filter((t) => t.status === s).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome{org?.company_name ? `, ${org.company_name}` : ''}</h2>
        <p className="text-muted-foreground">Overview of your tours</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Tours', v: tours.length },
          { label: 'Approved', v: count('approved') },
          { label: 'Pending', v: count('pending') },
          { label: 'Rejected', v: count('rejected') },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold">{s.v}</CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent tours</CardTitle></CardHeader>
        <CardContent>
          {tours.length === 0 ? (
            <p className="text-muted-foreground">No tours yet. <Link to="/tour/tours" className="text-primary hover:underline">Create your first tour</Link>.</p>
          ) : (
            <ul className="divide-y">
              {tours.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{t.title || 'Untitled tour'}</p>
                    <p className="text-xs text-muted-foreground">{t.destination}</p>
                  </div>
                  <Badge variant={t.status === 'approved' ? 'default' : 'secondary'}>{t.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
