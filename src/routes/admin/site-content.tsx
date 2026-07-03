import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, Plus, Trash2, Sparkles, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES } from '@/data/locations';
import heroImg from '@/assets/hero-citadel.jpg';

export const Route = createFileRoute('/admin/site-content')({ component: SiteContentPage });

/* ============================== TYPES ============================== */

type FontFamily = 'display' | 'sans';
type FontSize = 'sm' | 'md' | 'lg' | 'xl';

interface Word {
  text: string;
  color: string;
  font: FontFamily;
  size: FontSize;
}

interface HeroLayout {
  headline: { x: number; y: number; maxWidth: number; words: Word[] };
  subheadline: { text: string; x: number; y: number; maxWidth: number; color: string; font: FontFamily; size: FontSize };
  buttons: { label: string; x: number; y: number; style: 'primary' | 'secondary' }[];
}

interface HeroRow {
  id: number;
  layout: HeroLayout;
}

interface CoverRow {
  category: string;
  image_url: string;
}

const SIZE_PX: Record<FontSize, string> = { sm: '20px', md: '30px', lg: '46px', xl: '60px' };
const SUB_SIZE_PX: Record<FontSize, string> = { sm: '14px', md: '16px', lg: '18px', xl: '22px' };

function SiteContentPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Site Content</h1>
        <p className="text-sm text-muted-foreground">
          Drag the headline, subheadline, and buttons directly on the real hero image. Changes go live immediately after saving.
        </p>
      </div>
      <HeroEditor />
      <CategoryCoversEditor />
    </div>
  );
}

/* ============================== HERO EDITOR (WYSIWYG) ============================== */

function HeroEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-site-hero'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_hero').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data as unknown as HeroRow | null;
    },
  });

  const [layout, setLayout] = useState<HeroLayout | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data?.layout) setLayout(data.layout);
  }, [data]);

  async function save() {
    if (!layout) return;
    setBusy(true);
    const { error } = await supabase.from('site_hero').upsert({
      id: 1,
      layout,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Hero section updated');
    qc.invalidateQueries({ queryKey: ['admin-site-hero'] });
    qc.invalidateQueries({ queryKey: ['public-site-hero'] });
  }

  function clampPct(n: number) {
    return Math.max(0, Math.min(95, n));
  }

  function startDrag(target: 'headline' | 'subheadline' | number) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas || !layout) return;
      const rect = canvas.getBoundingClientRect();

      function onMove(ev: PointerEvent) {
        const x = clampPct(((ev.clientX - rect.left) / rect.width) * 100);
        const y = clampPct(((ev.clientY - rect.top) / rect.height) * 100);
        setLayout((prev) => {
          if (!prev) return prev;
          if (target === 'headline') return { ...prev, headline: { ...prev.headline, x, y } };
          if (target === 'subheadline') return { ...prev, subheadline: { ...prev.subheadline, x, y } };
          const buttons = [...prev.buttons];
          buttons[target as number] = { ...buttons[target as number], x, y };
          return { ...prev, buttons };
        });
      }
      function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  function updateWord(i: number, patch: Partial<Word>) {
    setLayout((prev) => {
      if (!prev) return prev;
      const words = [...prev.headline.words];
      words[i] = { ...words[i], ...patch };
      return { ...prev, headline: { ...prev.headline, words } };
    });
  }

  function addWord() {
    setLayout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        headline: {
          ...prev.headline,
          words: [...prev.headline.words, { text: 'WORD', color: '#F5F0E6', font: 'display', size: 'lg' }],
        },
      };
    });
  }

  function removeWord(i: number) {
    setLayout((prev) => {
      if (!prev) return prev;
      const words = prev.headline.words.filter((_, idx) => idx !== i);
      return { ...prev, headline: { ...prev.headline, words } };
    });
    setSelectedWord(null);
  }

  if (isLoading || !layout) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading hero content…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Section — drag directly on the image</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* THE REAL HERO IMAGE, WYSIWYG CANVAS */}
        <div
          ref={canvasRef}
          className="relative w-full select-none overflow-hidden rounded-2xl border border-border"
          style={{ aspectRatio: '1920 / 575' }}
        >
          <img src={heroImg} alt="Hero preview" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-black/25" />

          {/* Headline (draggable as a block; click a word to style it) */}
          <div
            onPointerDown={startDrag('headline')}
            className="absolute cursor-move touch-none leading-[1.05]"
            style={{ left: `${layout.headline.x}%`, top: `${layout.headline.y}%`, maxWidth: `${layout.headline.maxWidth}%` }}
          >
            {layout.headline.words.map((w, i) => (
              <span
                key={i}
                onPointerDown={(e) => { e.stopPropagation(); setSelectedWord(i); }}
                className={`mr-2 inline-block font-bold ${w.font === 'display' ? 'font-display' : 'font-sans'} ${selectedWord === i ? 'ring-2 ring-white/80' : ''}`}
                style={{ color: w.color, fontSize: SIZE_PX[w.size] }}
              >
                {w.text}
              </span>
            ))}
          </div>

          {/* Subheadline (draggable) */}
          <div
            onPointerDown={startDrag('subheadline')}
            className={`absolute cursor-move touch-none ${layout.subheadline.font === 'display' ? 'font-display' : 'font-sans'}`}
            style={{
              left: `${layout.subheadline.x}%`,
              top: `${layout.subheadline.y}%`,
              maxWidth: `${layout.subheadline.maxWidth}%`,
              color: layout.subheadline.color,
              fontSize: SUB_SIZE_PX[layout.subheadline.size],
            }}
          >
            {layout.subheadline.text}
          </div>

          {/* Buttons (draggable) */}
          {layout.buttons.map((b, i) => (
            <div
              key={i}
              onPointerDown={startDrag(i)}
              className={`absolute flex cursor-move touch-none items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold ${
                b.style === 'primary' ? 'bg-primary text-primary-foreground' : 'border border-white/40 bg-black/30 text-white backdrop-blur'
              }`}
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
            >
              {b.style === 'primary' ? <Sparkles className="h-3.5 w-3.5" /> : <Shuffle className="h-3.5 w-3.5" />}
              {b.label}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Drag the headline, subheadline, or either button anywhere on the image above. Click a headline word to select and style it below.
        </p>

        {/* WORD-BY-WORD HEADLINE EDITOR */}
        <div className="rounded-2xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Headline words</p>
            <Button size="sm" variant="outline" onClick={addWord}><Plus className="mr-1 h-3.5 w-3.5" /> Add word</Button>
          </div>
          <div className="space-y-2">
            {layout.headline.words.map((w, i) => (
              <div
                key={i}
                className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 ${selectedWord === i ? 'border-gold bg-gold/5' : 'border-border'}`}
                onClick={() => setSelectedWord(i)}
              >
                <Input
                  value={w.text}
                  onChange={(e) => updateWord(i, { text: e.target.value })}
                  className="h-8 w-32"
                />
                <input
                  type="color"
                  value={w.color}
                  onChange={(e) => updateWord(i, { color: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-input"
                />
                <Select value={w.font} onValueChange={(v: FontFamily) => updateWord(i, { font: v })}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="display">Serif</SelectItem>
                    <SelectItem value="sans">Sans-serif</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={w.size} onValueChange={(v: FontSize) => updateWord(i, { size: v })}>
                  <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                    <SelectItem value="xl">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => removeWord(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </div>

        {/* SUBHEADLINE + BUTTON LABELS */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="mb-2 text-sm font-semibold">Subheadline</p>
            <Textarea
              rows={3}
              value={layout.subheadline.text}
              onChange={(e) => setLayout({ ...layout, subheadline: { ...layout.subheadline, text: e.target.value } })}
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <input
                type="color"
                value={layout.subheadline.color}
                onChange={(e) => setLayout({ ...layout, subheadline: { ...layout.subheadline, color: e.target.value } })}
                className="h-9 w-full cursor-pointer rounded border border-input"
              />
              <Select value={layout.subheadline.font} onValueChange={(v: FontFamily) => setLayout({ ...layout, subheadline: { ...layout.subheadline, font: v } })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="display">Serif</SelectItem>
                  <SelectItem value="sans">Sans-serif</SelectItem>
                </SelectContent>
              </Select>
              <Select value={layout.subheadline.size} onValueChange={(v: FontSize) => setLayout({ ...layout, subheadline: { ...layout.subheadline, size: v } })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="xl">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="mb-2 text-sm font-semibold">Button labels</p>
            <div className="space-y-2">
              {layout.buttons.map((b, i) => (
                <Input
                  key={i}
                  value={b.label}
                  onChange={(e) => {
                    const buttons = [...layout.buttons];
                    buttons[i] = { ...buttons[i], label: e.target.value };
                    setLayout({ ...layout, buttons });
                  }}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Button actions stay the same (Generate My Plan / Surprise Me) — you can only change their text and position, not what they do.
            </p>
          </div>
        </div>

        <Button onClick={save} disabled={busy} className="bg-gold text-background hover:bg-gold/90">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Hero Section
        </Button>
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
