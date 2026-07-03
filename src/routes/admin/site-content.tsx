import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES } from '@/data/locations';

export const Route = createFileRoute('/admin/site-content')({ component: SiteContentPage });

interface HeroRow {
  id: number;
  headline: string;
  subheadline: string;
  headline_color: string;
  font_family: 'display' | 'sans';
  font_size: 'sm' | 'md' | 'lg' | 'xl';
}

interface CoverRow {
  category: string;
  image_url: string;
}

function SiteContentPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Site Content</h1>
        <p className="text-sm text-muted-foreground">
          Edit the homepage hero text and the Explore Erbil category cover images. Changes go live immediately.
        </p>
      </div>
      <HeroEditor />
      <CategoryCoversEditor />
    </div>
  );
}

/* ============================== HERO EDITOR ============================== */

function HeroEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-site-hero'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_hero').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data as HeroRow | null;
    },
  });

  const [form, setForm] = useState<HeroRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function save() {
    if (!form) return;
    setBusy(true);
    const { error } = await supabase.from('site_hero').upsert({
      id: 1,
      headline: form.headline,
      subheadline: form.subheadline,
      headline_color: form.headline_color,
      font_family: form.font_family,
      font_size: form.font_size,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Hero section updated');
    qc.invalidateQueries({ queryKey: ['admin-site-hero'] });
    qc.invalidateQueries({ queryKey: ['public-site-hero'] });
  }

  if (isLoading || !form) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading hero content…
        </CardContent>
      </Card>
    );
  }

  const sizeClass = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-5xl', xl: 'text-6xl' }[form.font_size];
  const fontClass = form.font_family === 'display' ? 'font-display' : 'font-sans';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Headline</Label>
              <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Subheadline</Label>
              <Textarea rows={3} value={form.subheadline} onChange={(e) => setForm({ ...form, subheadline: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs">Text Color</Label>
                <input
                  type="color"
                  value={form.headline_color}
                  onChange={(e) => setForm({ ...form, headline_color: e.target.value })}
                  className="h-10 w-full cursor-pointer rounded-md border border-input"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Font</Label>
                <Select value={form.font_family} onValueChange={(v: 'display' | 'sans') => setForm({ ...form, font_family: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="display">Serif (Display)</SelectItem>
                    <SelectItem value="sans">Sans-serif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Size</Label>
                <Select value={form.font_size} onValueChange={(v: HeroRow['font_size']) => setForm({ ...form, font_size: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                    <SelectItem value="xl">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={save} disabled={busy} className="bg-gold text-background hover:bg-gold/90">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Hero Section
            </Button>
          </div>

          {/* Live preview */}
          <div className="rounded-2xl border border-border bg-black/90 p-8">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Live Preview</p>
            <h2 className={`${fontClass} ${sizeClass} font-bold leading-[1.05]`} style={{ color: form.headline_color }}>
              {form.headline || 'Your headline…'}
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/80">{form.subheadline}</p>
          </div>
        </div>
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
            {CATEGORIES.map((c) => {
              const cover = data?.find((d) => d.category === c.name);
              const busy = uploadingFor === c.name;
              return (
                <div key={c.name} className="overflow-hidden rounded-2xl border border-border">
                  <div className="relative aspect-[4/3] bg-muted">
                    {cover?.image_url ? (
                      <img src={cover.image_url} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No custom cover (using default)
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadCover(c.name, file);
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
