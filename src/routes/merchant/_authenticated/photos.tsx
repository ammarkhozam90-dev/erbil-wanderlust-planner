import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyMerchant } from '@/components/merchant/use-my-merchant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';
import { compressImage } from '@/lib/compress-image';
import type { MerchantPhoto } from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/merchant/_authenticated/photos')({
  component: Photos,
});

function Photos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: m } = useMyMerchant(user?.id);

  const photosQ = useQuery({
    queryKey: ['merchant-photos', m?.id],
    enabled: !!m?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_photos')
        .select('*')
        .eq('merchant_id', m!.id)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as MerchantPhoto[];
    },
  });

  if (!m) return <div className="text-muted-foreground">Set up your business first.</div>;

  function extractStoragePath(url: string | null | undefined): string | null {
    if (!url) return null;
    const marker = '/storage/v1/object/public/merchant-media/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  }

  async function upload(kind: 'logo' | 'cover' | 'gallery', file: File) {
    const previousUrl = kind === 'logo' ? m!.logo_url : kind === 'cover' ? m!.cover_url : null;

    // Shrink + re-encode before it ever leaves the browser, so storage
    // usage and page weight stay small no matter what the merchant uploads.
    let toUpload: Blob;
    try {
      toUpload = await compressImage(file, { maxSizeKB: 250, maxDimension: 1920 });
    } catch {
      toUpload = file; // fall back to the original if compression somehow fails
    }

    const path = `${user!.id}/${m!.id}/${kind}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from('merchant-media').upload(path, toUpload, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (upErr) return toast.error(upErr.message);
    const { data } = supabase.storage.from('merchant-media').getPublicUrl(path);
    const url = data.publicUrl;

    if (kind === 'gallery') {
      await supabase.from('merchant_photos').insert({ merchant_id: m!.id, url, sort_order: photosQ.data?.length ?? 0 });
      qc.invalidateQueries({ queryKey: ['merchant-photos', m!.id] });
    } else {
      await supabase.from('merchants').update({ [`${kind}_url`]: url }).eq('id', m!.id);
      qc.invalidateQueries({ queryKey: ['my-merchant', user!.id] });
      // Clean up the file it's replacing so storage doesn't grow forever.
      const oldPath = extractStoragePath(previousUrl);
      if (oldPath) await supabase.storage.from('merchant-media').remove([oldPath]);
    }
    toast.success('Uploaded');
  }

  async function removePhoto(photo: MerchantPhoto) {
    await supabase.from('merchant_photos').delete().eq('id', photo.id);
    const path = extractStoragePath(photo.url);
    if (path) await supabase.storage.from('merchant-media').remove([path]);
    qc.invalidateQueries({ queryKey: ['merchant-photos', m!.id] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h2 className="font-display text-2xl font-bold">Photos</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {m.logo_url && <img src={m.logo_url} alt="logo" className="h-24 w-24 rounded object-cover" />}
            <UploadInput label="Upload logo" onPick={(f) => { void upload("logo", f); }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cover image</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {m.cover_url && <img src={m.cover_url} alt="cover" className="h-32 w-full rounded object-cover" />}
            <UploadInput label="Upload cover" onPick={(f) => { void upload("cover", f); }} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Gallery</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <UploadInput label="Add photo" onPick={(f) => { void upload("gallery", f); }} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {photosQ.data?.map((p) => (
              <div key={p.id} className="group relative">
                <img src={p.url} alt={p.caption} className="aspect-square w-full rounded object-cover" />
                <button
                  onClick={() => removePhoto(p)}
                  className="absolute right-1 top-1 rounded bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UploadInput({ label, onPick }: { label: string; onPick: (f: File) => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-accent">
      <Upload className="h-4 w-4" />
      {busy ? 'Uploading…' : label}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          await onPick(f);
          setBusy(false);
          e.target.value = '';
        }}
      />
    </Label>
  );
}
