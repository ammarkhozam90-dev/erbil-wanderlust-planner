import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { TourBooking } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/admin/bookings')({ ssr: false, component: AdminBookings });

type Row = TourBooking & { tour_title: string; organizer_name: string };

function AdminBookings() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

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

  async function load() {
    // One round trip: bookings, then the tours + organizers they belong to,
    // joined client-side — simpler than a Postgres view for this volume.
    const { data: bookings } = await supabase.from('tour_bookings').select('*').order('created_at', { ascending: false });
    const tourIds = [...new Set((bookings ?? []).map((b) => b.tour_id))];
    const { data: tours } = tourIds.length
      ? await supabase.from('tours').select('id, title, organizer_id').in('id', tourIds)
      : { data: [] };
    const orgIds = [...new Set((tours ?? []).map((t) => t.organizer_id))];
    const { data: orgs } = orgIds.length
      ? await supabase.from('tour_organizers').select('id, company_name').in('id', orgIds)
      : { data: [] };

    const tourById = new Map((tours ?? []).map((t) => [t.id, t]));
    const orgById = new Map((orgs ?? []).map((o) => [o.id, o.company_name]));

    setRows((bookings ?? []).map((b) => ({
      ...(b as TourBooking),
      tour_title: tourById.get(b.tour_id)?.title ?? '—',
      organizer_name: orgById.get(tourById.get(b.tour_id)?.organizer_id ?? '') ?? '—',
    })));
  }
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function setStatus(id: string, status: TourBooking['status']) {
    const { error } = await supabase.from('tour_bookings').update({ status }).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  }

  if (isAdmin === null) return <div className="p-8">Loading…</div>;

  const groups = {
    pending: rows.filter((r) => r.status === 'pending'),
    confirmed: rows.filter((r) => r.status === 'confirmed'),
    cancelled: rows.filter((r) => r.status === 'cancelled'),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-bold">Bookings</h1>
      <p className="text-sm text-muted-foreground">
        Every booking request across every tour — whether it was created here by an admin or submitted
        by an outside tour organizer.
      </p>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({groups.pending.length})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        {(['pending', 'confirmed', 'cancelled'] as const).map((k) => (
          <TabsContent key={k} value={k} className="space-y-3">
            {groups[k].length === 0 && <p className="text-muted-foreground">Nothing here.</p>}
            {groups[k].map((b) => (
              <Card key={b.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{b.full_name} — {b.tour_title}</CardTitle>
                    <Badge variant="outline">{b.organizer_name}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>{b.phone}{b.email && ` • ${b.email}`}</p>
                  <p className="text-muted-foreground">
                    {b.adults} adult(s){b.children > 0 && `, ${b.children} child(ren)`} • requested {new Date(b.created_at).toLocaleDateString()}
                  </p>
                  {b.notes && <p className="text-muted-foreground">"{b.notes}"</p>}
                  {b.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => setStatus(b.id, 'confirmed')}>Confirm</Button>
                      <Button size="sm" variant="destructive" onClick={() => setStatus(b.id, 'cancelled')}>Cancel</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
