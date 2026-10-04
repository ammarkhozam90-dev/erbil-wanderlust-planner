import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES } from '@/data/locations';
import heroImg from '@/assets/hero-citadel.jpg';

export const Route = createFileRoute('/admin/site-content')({ component: SiteContentPage });

/* ============================== TYPES ============================== */

// The hero "layout" JSON keeps all its existing fields (text, buttons, alignment…)
// so the public homepage keeps working. The admin only ever touches `image_url`.
type HeroLayout = Record<string, unknown> & { image_url?: string };
interface HeroRow { id: number; layout: HeroLayout | null; }
interface CoverRow { category: string; image_url: string; }

// Extra cards that are not part of CATEGORIES in '@/data/locations'.
const EXTRA_COVERS = ['Organized Tours'];

function SiteContentPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Site Content</h1>
        <p className="text-sm text-muted-foreground">
          Change the homepage hero image and the Explore Erbil card images.
        </p>
      </div>
      <HeroImageEditor />
      <CategoryCoversEditor />
    </div>
  );
}

/* ============================== HERO IMAGE EDITOR ============================== */

function HeroImageEditor() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-site-hero'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_hero').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data as unknown as HeroRow | null;
    },
  });

  async function uploadHero(file: File) {
    // Never overwrite the layout with a partial object: merge into what is already saved.
    if (!data?.layout) {
      return toast.error('Hero row not found in site_hero (id = 1).');
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `hero/hero-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('site-content').upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      return toast.error(uploadError.message);
    }
    const { data: pub } = supabase.storage.from('site-content').getPublicUrl(path);
    const { error } = await supabase.from('site_hero').upsert({
      id: 1,
      layout: { ...data.layout, image_url: pub.publicUrl } as any,
      updated_at: new Date().toISOString(),
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success('Hero image updated');
    qc.invalidateQueries({ queryKey: ['admin-site-hero'] });
    qc.invalidateQueries({ queryKey: ['public-site-hero'] });
  }

  const currentImage = data?.layout?.image_url || heroImg;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Hero Section</CardTitle>
        <label>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading || isLoading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadHero(file);
              e.target.value = '';
            }}
          />
          <Button size="sm" variant="outline" asChild disabled={uploading || isLoading}>
            <span className="cursor-pointer">
              {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
              Change hero image
            </span>
          </Button>
        </label>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading hero…
          </div>
        ) : (
          <div className="relative w-full overflow-hidden rounded-2xl border border-border" style={{ aspectRatio: '1920 / 575' }}>
            <img src={currentImage} alt="Hero" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================== CATEGORY COVERS EDITOR ============================== */

function CategoryCoversEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-category-covers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('category_covers').select('*');
      if (error) throw error;
      return (data ?? []) as CoverRow[];
    },
  });

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const cardNames = [...CATEGORIES.map((c) => c.name), ...EXTRA_COVERS.filter((n) => !CATEGORIES.some((c) => c.name === n))];

  async function uploadCover(category: string, file: File) {
    setUploadingFor(category);
    const ext = file.name.split('.').pop();
    const path = `category-covers/${category.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('site-content').upload(path, file, { upsert: true });
    if (uploadError) {
      setUploadingFor(null);
      return toast.error(uploadError.message);
    }
    const { data: pub } = supabase.storage.from('site-content').getPublicUrl(path);
    const { error } = await supabase.from('category_covers').upsert({
      category,
      image_url: pub.publicUrl,
      updated_at: new Date().toISOString(),
    });
    setUploadingFor(null);
    if (error) return toast.error(error.message);
    toast.success(`${category} cover updated`);
    qc.invalidateQueries({ queryKey: ['admin-category-covers'] });
    qc.invalidateQueries({ queryKey: ['public-category-covers'] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Explore Erbil — Category Covers</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading covers…
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cardNames.map((name) => {
              const cover = data?.find((d) => d.category === name);
              const busy = uploadingFor === name;
              return (
                <div key={name} className="overflow-hidden rounded-2xl border border-border">
                  <div className="relative aspect-[4/3] bg-muted">
                    {cover?.image_url ? (
                      <img src={cover.image_url} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No custom cover (using default)
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="text-sm font-semibold">{name}</p>
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadCover(name, file);
                          e.target.value = '';
                        }}
                      />
                      <Button size="sm" variant="outline" asChild disabled={busy}>
                        <span className="cursor-pointer">
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
