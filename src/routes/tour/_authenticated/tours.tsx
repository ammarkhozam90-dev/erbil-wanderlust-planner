import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';
import { useMyTours, setSelectedTour, useSelectedTour } from '@/components/tour/use-tours';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TourWizard } from '@/components/tour/TourWizard';
import type { Tour } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/tour/_authenticated/tours')({ component: MyTours });

function MyTours() {
  const { user } = useAuth();
  const { data: org } = useMyOrganizer(user?.id);
  const qc = useQueryClient();
  const { data: tours = [] } = useMyTours(org?.id);
  const selectedId = useSelectedTour();
  const [editing, setEditing] = useState<Partial<Tour> | null>(null);
  const [creating, setCreating] = useState(false);

  function createNew() {
    if (!org) return;
    setCreating(true);
    // Deferred, same as the admin wizard: nothing is written to the tours
    // table until the Basics step is actually saved, so a cancelled or
    // abandoned "+ New Tour" click never leaves an empty row behind.
    setEditing({
      organizer_id: org.id, title: '', short_description: '', full_description: '',
      category: 'city', destination: '', cover_url: '', adult_price: null,
      currency: 'USD', status: 'draft',
    });
    setCreating(false);
  }

  async function del(id: string) {
    if (!confirm('Delete this tour?')) return;
    await supabase.from('tours').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['my-tours', org?.id] });
  }

  if (editing) {
    return (
      <TourWizard
        initialTour={editing}
        uploaderUserId={user!.id}
        mode="organizer"
        onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['my-tours', org?.id] }); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Tours</h2>
        <Button onClick={createNew} disabled={creating || !org}>
          {creating ? 'Preparing…' : '+ New Tour'}
        </Button>
      </div>
      {tours.length === 0 && <p className="text-muted-foreground">No tours yet — create your first one above.</p>}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {tours.map((t) => (
          <Card key={t.id} className={selectedId === t.id ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{t.title || 'Untitled'}</CardTitle>
                <Badge variant={t.status === 'approved' ? 'default' : 'secondary'}>{t.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{t.short_description || '—'}</p>
              {t.status === 'rejected' && t.rejection_reason && (
                <p className="text-xs text-destructive">Rejected: {t.rejection_reason}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { setSelectedTour(t.id); setEditing(t); }}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedTour(t.id)}>Select</Button>
                <Button size="sm" variant="destructive" onClick={() => del(t.id)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
