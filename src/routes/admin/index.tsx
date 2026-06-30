import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { isAdmin } = useAuth();

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('merchants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count || 0;
    },
  });

  if (!isAdmin) return <div className="p-8">Access Denied.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <h1 className="text-3xl font-bold">Admin Control Center</h1>

      {/* لوحة تنبيه بوجود طلبات جديدة */}
      <section>
        <Card className="border-yellow-500 bg-yellow-50/50">
          <CardHeader>
            <CardTitle>Merchant Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-lg">
              There are <span className="font-bold text-yellow-700">{pendingCount}</span> pending merchant applications.
            </p>
            <Link 
              to="/admin/merchants" 
              className="inline-flex h-9 items-center justify-center rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
            >
              Review Applications
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
