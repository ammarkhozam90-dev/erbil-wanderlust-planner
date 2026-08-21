import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import { Car, CalendarDays, TrendingUp, Building2 } from 'lucide-react';

export const Route = createFileRoute('/admin/analytics')({ component: Analytics });

type Period = 'day' | 'week' | 'month' | 'year';
type TaxiClick = {
  provider: 'careem' | 'baly';
  created_at: string;
  business_id: string | null;
};
type MerchantName = { id: string; name: string | null; brand_group_id: string | null };

function Analytics() {
  const [period, setPeriod] = useState<Period>('day');

  const q = useQuery({
    queryKey: ['admin-analytics', 'taxi-clicks'],
    queryFn: async () => {
      const [{ data: merchants }, { data: roles }, { data: clicks, error: clicksError }] = await Promise.all([
        supabase.from('merchants').select('id,name,category,status,created_at,brand_group_id'),
        supabase.from('user_roles').select('role,created_at').eq('role', 'merchant'),
        (supabase.from as any)('taxi_clicks')
          .select('provider,created_at,business_id')
          .eq('is_admin', false)
          .order('created_at', { ascending: true }),
      ]);

      if (clicksError) throw clicksError;
      return {
        merchants: merchants ?? [],
        roles: roles ?? [],
        taxiClicks: (clicks ?? []) as TaxiClick[],
      };
    },
  });

  const merchants = q.data?.merchants ?? [];
  const roles = q.data?.roles ?? [];
  const taxiClicks = q.data?.taxiClicks ?? [];
  const taxiReport = useMemo(() => buildTaxiReport(taxiClicks, merchants, period), [taxiClicks, merchants, period]);

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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operational and commercial performance across ErbilGo.</p>
      </div>

      <section className="space-y-4 rounded-2xl border border-gold/20 bg-gold/5 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-gold" />
              <h2 className="font-display text-xl font-bold">Taxi partner interest</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Unique CTA clicks from non-admin visitors only. Use these figures in Careem and Baly partnership reports.
            </p>
          </div>
          <div className="flex rounded-lg border border-border bg-background p-1">
            {(['day', 'week', 'month', 'year'] as Period[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  period === value ? 'bg-gold text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Careem clicks" value={taxiReport.careemTotal} icon={<span className="font-black">C</span>} tone="green" />
          <MetricCard title="Baly clicks" value={taxiReport.balyTotal} icon={<span className="font-black">B</span>} tone="yellow" />
          <MetricCard title="Total taxi clicks" value={taxiReport.total} icon={<TrendingUp className="h-4 w-4" />} tone="gold" />
        </div>

        <Card className="bg-background/70">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Clicks by {period}</CardTitle>
            <Badge variant="outline" className="gap-1 text-xs">
              <CalendarDays className="h-3 w-3" /> Non-admin traffic
            </Badge>
          </CardHeader>
          <CardContent className="h-[320px]">
            {taxiReport.total === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No taxi clicks recorded for this period yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={taxiReport.series}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" minTickGap={18} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="careem" name="Careem" stroke="#16a34a" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="baly" name="Baly" stroke="#eab308" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-background/70">
            <CardHeader><CardTitle className="text-base">Top destinations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {taxiReport.topBusinesses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Destination data will appear after the first click.</p>
              ) : taxiReport.topBusinesses.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate"><Building2 className="h-4 w-4 shrink-0 text-gold" />{item.name}</span>
                  <span className="font-semibold text-gold">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-background/70">
            <CardHeader><CardTitle className="text-base">Reporting note</CardTitle></CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              The report excludes administrator clicks at the database layer. Keep the selected period, export the visible totals, and compare month-over-month growth before sharing the figures with a taxi partner.
            </CardContent>
          </Card>
        </div>
      </section>

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

function MetricCard({ title, value, icon, tone }: { title: string; value: number; icon: ReactNode; tone: 'green' | 'yellow' | 'gold' }) {
  const styles = {
    green: 'bg-green-500/10 text-green-600',
    yellow: 'bg-yellow-500/10 text-yellow-600',
    gold: 'bg-gold/10 text-gold',
  };
  return (
    <Card className="bg-background/70">
      <CardContent className="flex items-center justify-between p-5">
        <div><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-3xl font-bold">{value.toLocaleString()}</p></div>
        <div className={`grid h-10 w-10 place-items-center rounded-full ${styles[tone]}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function buildTaxiReport(clicks: TaxiClick[], merchants: MerchantName[], period: Period) {
  const now = new Date();
  const bucketCount = period === 'day' ? 14 : period === 'week' ? 12 : period === 'month' ? 12 : 5;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(now);
    if (period === 'day') date.setDate(now.getDate() - (bucketCount - 1 - index));
    if (period === 'week') date.setDate(now.getDate() - (bucketCount - 1 - index) * 7);
    if (period === 'month') date.setMonth(now.getMonth() - (bucketCount - 1 - index));
    if (period === 'year') date.setFullYear(now.getFullYear() - (bucketCount - 1 - index));
    return { key: bucketKey(date, period), label: bucketLabel(date, period), careem: 0, baly: 0 };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const visible = clicks.filter((click) => bucketMap.has(bucketKey(new Date(click.created_at), period)));

  visible.forEach((click) => {
    const bucket = bucketMap.get(bucketKey(new Date(click.created_at), period));
    if (bucket) bucket[click.provider] += 1;
  });

  const merchantData = new Map(merchants.map((m) => [m.id, m]));
  
  // Group by Brand (Group ID) for top destinations report
  const brandStats: Record<string, { name: string; count: number }> = {};
  
  visible.forEach((click) => {
    if (!click.business_id) return;
    const m = merchantData.get(click.business_id);
    if (!m) return;
    
    // Use brand_group_id if available, otherwise fallback to business_id
    const groupId = m.brand_group_id || m.id;
    if (!brandStats[groupId]) {
      brandStats[groupId] = { name: m.name || 'Unnamed business', count: 0 };
    }
    brandStats[groupId].count += 1;
  });

  return {
    series: buckets,
    careemTotal: visible.filter((click) => click.provider === 'careem').length,
    balyTotal: visible.filter((click) => click.provider === 'baly').length,
    total: visible.length,
    topBusinesses: Object.entries(brandStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([id, data]) => ({ id, name: data.name, value: data.count })),
  };
}

function bucketKey(date: Date, period: Period) {
  if (period === 'day') return date.toISOString().slice(0, 10);
  if (period === 'month') return date.toISOString().slice(0, 7);
  if (period === 'year') return String(date.getUTCFullYear());
  const monday = new Date(date);
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

function bucketLabel(date: Date, period: Period) {
  if (period === 'day') return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (period === 'month') return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  if (period === 'year') return String(date.getFullYear());
  return `Week of ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
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
