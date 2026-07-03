import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';
import { useMyTours, useSelectedTour } from '@/components/tour/use-tours';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { TourPhoto } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/tour/_authenticated/gallery')({ component: Gallery });

function Gallery() {
  const { user } = useAuth();
  const { data: org } = useMyOrganizer(user?.id);
  const { data: tours = [] } = useMyTours(org?.id);
  const selectedId = useSelectedTour() ?? tours[0]?.id;
  const tour = tours.find((t) => t.id === selectedId);

  const [photos, setPhotos] = useState<TourPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  async function reload() {
    if (!tour) return;
    const { data } = await supabase.from('tour_photos').select('*').eq('tour_id', tour.id).order('sort_order');
    setPhotos((data ?? []) as TourPhoto[]);
  }
  useEffect(() => { reload(); }, [tour?.id]);

  async function uploadCover(f: File) {
    if (!tour || !user) return;
    setUploading(true);
    const key = `${user.id}/${tour.id}/cover-${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from('tour-media').upload(key, f, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from('tour-media').getPublicUrl(key);
    await supabase.from('tours').update({ cover_url: data.publicUrl }).eq('id', tour.id);
    setUploading(false);
    toast.success('Cover updated');
  }

  async function uploadGallery(fs: FileList, kind: 'gallery'|'destination'|'vehicle') {
    if (!tour || !user) return;
    setUploading(true);
    for (const f of Array.from(fs)) {
      const key = `${user.id}/${tour.id}/${kind}-${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from('tour-media').upload(key, f);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from('tour-media').getPublicUrl(key);
      await supabase.from('tour_photos').insert({ tour_id: tour.id, url: data.publicUrl, kind });
    }
    setUploading(false);
    reload();
  }

  async function remove(p: TourPhoto) {
    await supabase.from('tour_photos').delete().eq('id', p.id);
    reload();
  }

  if (!tour) return <p className="text-muted-foreground">Create/select a tour first from “My Tours”.</p>;

  const groups: Array<[TourPhoto['kind'], string]> = [
    ['gallery', 'Gallery'], ['destination', 'Destination Images'], ['vehicle', 'Vehicle Images'],
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gallery — {tour.title}</h2>
      <Card>
        <CardHeader><CardTitle>Cover Image</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {tour.cover_url && <img src={tour.cover_url} alt="cover" className="h-40 w-full rounded object-cover" />}
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} disabled={uploading} />
        </CardContent>
      </Card>

      {groups.map(([k, label]) => (
        <Card key={k}>
          <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Upload</Label>
              <Input type="file" accept="image/*" multiple
                onChange={(e) => e.target.files && uploadGallery(e.target.files, k)} disabled={uploading} />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {photos.filter((p) => p.kind === k).map((p) => (
                <div key={p.id} className="relative">
                  <img src={p.url} className="h-32 w-full rounded object-cover" alt="" />
                  <Button size="sm" variant="destructive" className="absolute right-1 top-1"
                    onClick={() => remove(p)}>×</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
