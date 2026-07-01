import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Clock, CheckCircle2, XCircle, Users, Images, TrendingUp, UserPlus,
} from 'lucide-react';

export const Route = createFileRoute('/admin/')({ component: AdminDashboard });

function AdminDashboard() {
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const week = new Date(Date.now() - 7 * 864e5).toISOString();
      const month = new Date(Date.now() - 30 * 864e5).toISOString();
      const count = (q: any) => q.then((r: any) => r.count ?? 0);
      const [
        total, pending, approved, rejected, merchants, photos, weekCount, monthMerchants,
      ] = await Promise.all([
        count(supabase.from('merchants').select('*', { count: 'exact', head: true })),
        count(supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
        count(supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('status', 'approved')),
        count(supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('status', 'rejected')),
        count(supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'merchant')),
        count(supabase.from('merchant_photos').select('*', { count: 'exact', head: true })),
        count(supabase.from('merchants').select('*', { count: 'exact', head: true }).gte('created_at', week)),
        count(supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'merchant').gte('created_at', month)),
      ]);
      return { total, pending, approved, rejected, merchants, photos, weekCount, monthMerchants };
    },
  });

  const submissions = useQuery({
    queryKey: ['admin-latest-submissions'],
    queryFn: async () => {
      const { data } = await supabase.from('merchants')
        .select('id,name,category,status,submitted_at,created_at')
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(6);
      return data ?? [];
    },
  });

  const activity = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase.from('activity_log')
        .select('id,action,actor_email,target_label,created_at')
        .order('created_at', { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  const cards = [
    { label: 'Total Businesses', value: stats.data?.total, icon: Building2 },
    { label: 'Pending Review',   value: stats.data?.pending, icon: Clock },
    { label: 'Approved',         value: stats.data?.approved, icon: CheckCircle2 },
    { label: 'Rejected',         value: stats.data?.rejected, icon: XCircle },
    { label: 'Total Merchants',  value: stats.data?.merchants, icon: Users },
    { label: 'Total Photos',     value: stats.data?.photos, icon: Images },
    { label: 'Added This Week',  value: stats.data?.weekCount, icon: TrendingUp },
    { label: 'New Merchants (30d)', value: stats.data?.monthMerchants, icon: UserPlus },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of ErbilGo activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats.isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{c.value ?? 0}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Latest submissions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {submissions.isLoading && <Skeleton className="h-24 w-full" />}
            {submissions.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
            {submissions.data?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">{s.name || '(untitled)'}</div>
                  <div className="text-xs text-muted-foreground capitalize">{s.category}</div>
                </div>
                <Badge variant="outline" className="capitalize">{s.status}</Badge>
              </div>
            ))}
            <div className="pt-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/approvals">Go to approvals</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {activity.data?.length === 0 && <p className="text-muted-foreground">No activity yet.</p>}
            {activity.data?.map((a: any) => (
              <div key={a.id} className="border-b pb-2 last:border-0">
                <div className="font-medium">{a.action}</div>
                <div className="text-xs text-muted-foreground">
                  {a.actor_email} · {new Date(a.created_at).toLocaleString()}
                </div>
                {a.target_label && <div className="text-xs">{a.target_label}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/admin/approvals">Review pending</Link></Button>
          <Button asChild variant="outline"><Link to="/admin/businesses">Manage businesses</Link></Button>
          <Button asChild variant="outline"><Link to="/admin/photos">Moderate photos</Link></Button>
          <Button asChild variant="outline"><Link to="/admin/categories">Categories</Link></Button>
          <Button asChild variant="outline"><Link to="/admin/users">Users</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
