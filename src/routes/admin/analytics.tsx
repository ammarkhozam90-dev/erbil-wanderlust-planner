import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from 'recharts';

export const Route = createFileRoute('/admin/analytics')({ component: Analytics });

function Analytics() {
  const q = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const { data: merchants } = await supabase.from('merchants').select('category,status,created_at');
      const { data: roles } = await supabase.from('user_roles').select('role,created_at').eq('role', 'merchant');
      return { merchants: merchants ?? [], roles: roles ?? [] };
    },
  });

  const merchants = q.data?.merchants ?? [];
  const roles = q.data?.roles ?? [];

  const byCategory = Object.entries(count(merchants, (m: any) => m.category))
    .map(([name, value]) => ({ name, value }));
  const byMonth = groupByMonth(merchants);
  const merchantsByMonth = groupByMonth(roles);
  const approved = merchants.filter((m: any) => m.status === 'approved').length;
  const rejected = merchants.filter((m: any) => m.status === 'rejected').length;
  const decided = approved + rejected || 1;
  const approvalRate = Math.round((approved / decided) * 100);
  const rejectionRate = Math.round((rejected / decided) * 100);
  const activeCats = [...byCategory].sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Businesses by category</CardTitle></CardHeader><CardContent style={{ height: 260 }}>
          <ResponsiveContainer><BarChart data={byCategory}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>New businesses per month</CardTitle></CardHeader><CardContent style={{ height: 260 }}>
          <ResponsiveContainer><LineChart data={byMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="value" stroke="hsl(var(--primary))" /></LineChart></ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Merchant registrations</CardTitle></CardHeader><CardContent style={{ height: 260 }}>
          <ResponsiveContainer><LineChart data={merchantsByMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="value" stroke="hsl(var(--primary))" /></LineChart></ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Approval vs rejection</CardTitle></CardHeader><CardContent style={{ height: 260 }}>
          <ResponsiveContainer><BarChart data={[{ name: 'Approved', value: approvalRate }, { name: 'Rejected', value: rejectionRate }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="value" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer>
        </CardContent></Card>

        <Card className="md:col-span-2"><CardHeader><CardTitle>Most active categories</CardTitle></CardHeader><CardContent style={{ height: 260 }}>
          <ResponsiveContainer><BarChart data={activeCats}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer>
        </CardContent></Card>
      </div>
    </div>
  );
}

function count<T>(arr: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  arr.forEach((x) => { const k = key(x) || 'unknown'; out[k] = (out[k] ?? 0) + 1; });
  return out;
}
function groupByMonth(arr: any[]) {
  const out: Record<string, number> = {};
  arr.forEach((x) => {
    if (!x.created_at) return;
    const d = new Date(x.created_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out[k] = (out[k] ?? 0) + 1;
  });
  return Object.entries(out).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
}
