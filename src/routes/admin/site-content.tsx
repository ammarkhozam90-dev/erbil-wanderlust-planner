import { createFileRoute, useBlocker } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, Minus, Plus, Bold, Sparkles, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES } from '@/data/locations';
import heroImg from '@/assets/hero-citadel.jpg';

export const Route = createFileRoute('/admin/site-content')({ component: SiteContentPage });

/* ============================== TYPES ============================== */

interface Run { text: string; color: string; fontSize: number; bold?: boolean; lineBreak?: boolean; }
interface TextBlock { runs: Run[]; }
type Align = 'left' | 'center' | 'right';
type BtnSize = 'sm' | 'md' | 'lg';
interface ButtonBlock { label: string; style: 'primary' | 'secondary'; size: BtnSize; }

interface HeroLayout {
  align: Align;
  eyebrow: TextBlock;
  headline: TextBlock;
  subheadline: TextBlock;
  buttons: ButtonBlock[];
}

interface HeroRow { id: number; layout: HeroLayout; }
interface CoverRow { category: string; image_url: string; }

type TextKey = 'eyebrow' | 'headline' | 'subheadline';
type Selection = { kind: 'run'; key: TextKey; index: number } | null;

// Reference size is "at desktop" — clamp() shrinks it smoothly on narrow
// screens instead of letting a fixed px value overflow / force a wrap.
function fluidSize(px: number) {
  const vw = (px / 19.2).toFixed(2); // 1920px reference width == 100vw
  const min = Math.max(12, Math.round(px * 0.4));
  return `clamp(${min}px, ${vw}vw, ${px}px)`;
}

const BTN_PAD: Record<BtnSize, string> = { sm: 'px-3 py-2 text-xs', md: 'px-5 py-3 text-sm', lg: 'px-7 py-4 text-base' };

function SiteContentPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Site Content</h1>
        <p className="text-sm text-muted-foreground">
          Double-click a sentence to edit its text. Click a single word to style just that word.
          Content flows naturally so it always looks right on mobile — position is controlled by alignment, not dragging.
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
      return data as unknown as HeroRow | null;
    },
  });

  const [layout, setLayout] = useState<HeroLayout | null>(null);
  const savedRef = useRef<string>('');
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [editingKey, setEditingKey] = useState<TextKey | null>(null);
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    if (data?.layout) {
      setLayout(data.layout);
      savedRef.current = JSON.stringify(data.layout);
    }
  }, [data]);

  const isDirty = !!layout && JSON.stringify(layout) !== savedRef.current;

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const blocker = useBlocker({ shouldBlockFn: () => isDirty, withResolver: true } as any);

  async function save() {
    if (!layout) return false;
    setBusy(true);
    const { error } = await supabase.from('site_hero').upsert({ id: 1, layout, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    toast.success('Hero section updated');
    savedRef.current = JSON.stringify(layout);
    qc.invalidateQueries({ queryKey: ['admin-site-hero'] });
    qc.invalidateQueries({ queryKey: ['public-site-hero'] });
    return true;
  }

  function discard() {
    if (savedRef.current) setLayout(JSON.parse(savedRef.current));
  }

  function updateRun(key: TextKey, index: number, patch: Partial<Run>) {
    setLayout((prev) => {
      if (!prev) return prev;
      const runs = [...prev[key].runs];
      runs[index] = { ...runs[index], ...patch };
      return { ...prev, [key]: { ...prev[key], runs } };
    });
  }
  function updateButton(index: number, patch: Partial<ButtonBlock>) {
    setLayout((prev) => {
      if (!prev) return prev;
      const buttons = [...prev.buttons];
      buttons[index] = { ...buttons[index], ...patch };
      return { ...prev, buttons };
    });
  }

  function startEdit(key: TextKey) {
    if (!layout) return;
    setSelection(null);
    setEditingKey(key);
    setDraftText(layout[key].runs.map((r) => r.text).join(' '));
  }

  function commitEdit(key: TextKey) {
    setLayout((prev) => {
      if (!prev) return prev;
      const oldRuns = prev[key].runs;
      const fallback = oldRuns[oldRuns.length - 1] ?? { color: '#F5F0E6', fontSize: 20 };
      const lines = draftText.split('\n');
      const runs: Run[] = [];
      let flat = 0;
      lines.forEach((line, li) => {
        line.split(/\s+/).filter(Boolean).forEach((w, wi) => {
          const old = oldRuns[flat];
          runs.push({
            text: w,
            color: old?.color ?? fallback.color,
            fontSize: old?.fontSize ?? fallback.fontSize,
            bold: old?.bold,
            lineBreak: li > 0 && wi === 0,
          });
          flat++;
        });
      });
      if (!runs.length) runs.push({ text: '', color: fallback.color, fontSize: fallback.fontSize });
      return { ...prev, [key]: { runs } };
    });
    setEditingKey(null);
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

  const runSelection = selection ? layout[selection.key].runs[selection.index] : null;
  const justify = layout.align === 'center' ? 'items-center text-center' : layout.align === 'right' ? 'items-end text-right' : 'items-start text-left';

  function renderBlock(key: TextKey, extraClass: string) {
    const block = layout[key];
    const isEditing = editingKey === key;
    if (isEditing) {
      return (
        <div className="flex flex-col items-start gap-1">
          <textarea
            autoFocus
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditingKey(null); }}
            className="min-w-[240px] rounded-md border-2 border-gold bg-black/80 p-2 text-white outline-none"
            rows={3}
          />
          <Button size="sm" onClick={() => commitEdit(key)} className="bg-gold text-background hover:bg-gold/90">Done</Button>
        </div>
      );
    }
    return (
      <div className={extraClass} onDoubleClick={() => startEdit(key)}>
        {block.runs.map((r, i) => (
          <span key={i}>
            {r.lineBreak && <br />}
            {i > 0 && !r.lineBreak && ' '}
            <span
              onClick={(e) => { e.stopPropagation(); setSelection({ kind: 'run', key, index: i }); }}
              className={`inline-block cursor-pointer ${selection?.key === key && selection.index === i ? 'ring-2 ring-gold' : ''}`}
              style={{ color: r.color, fontSize: fluidSize(r.fontSize), fontWeight: r.bold ? 700 : 400 }}
            >
              {r.text}
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Hero Section</CardTitle>
        <div className="flex items-center gap-2">
          {isDirty && <span className="text-xs font-medium text-gold">Unsaved changes</span>}
          <Button size="sm" variant="outline" onClick={discard} disabled={!isDirty || busy}>Discard</Button>
          <Button size="sm" onClick={save} disabled={!isDirty || busy} className="bg-gold text-background hover:bg-gold/90">
            {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alignment control */}
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content alignment</p>
          <Select value={layout.align} onValueChange={(v: Align) => setLayout({ ...layout, align: v })}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Live preview — same responsive flex structure as the real homepage */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-border" style={{ aspectRatio: '1920 / 575' }}>
          <img src={heroImg} alt="Hero preview" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/25" />
          <div className={`absolute inset-0 flex flex-col justify-center gap-2 p-6 lg:p-10 ${justify}`}>
            <div className="max-w-2xl">
              {renderBlock('eyebrow', 'mb-1 font-sans text-xs font-semibold uppercase tracking-[0.3em]')}
              {renderBlock('headline', 'font-display leading-[1.05]')}
              <div className="mt-2 max-w-lg font-sans">
                {renderBlock('subheadline', '')}
              </div>
              <div className={`mt-4 flex flex-wrap gap-3 ${layout.align === 'center' ? 'justify-center' : layout.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                {layout.buttons.map((b, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-xl font-semibold ${BTN_PAD[b.size]} ${
                      b.style === 'primary' ? 'bg-primary text-primary-foreground' : 'border border-white/40 bg-black/30 text-white'
                    }`}
                  >
                    {b.style === 'primary' ? <Sparkles className="h-4 w-4" /> : <Shuffle className="h-4 w-4" />}
                    {b.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Word style toolbar */}
        {runSelection && selection && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
            <p className="text-xs font-semibold">Selected word: "{runSelection.text}"</p>
            <input
              type="color"
              value={runSelection.color}
              onChange={(e) => updateRun(selection.key, selection.index, { color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-input"
            />
            <Button
              size="sm"
              variant={runSelection.bold ? 'default' : 'outline'}
              className="h-8 w-8 p-0"
              onClick={() => updateRun(selection.key, selection.index, { bold: !runSelection.bold })}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateRun(selection.key, selection.index, { fontSize: Math.max(8, runSelection.fontSize - 2) })}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-10 text-center text-xs">{runSelection.fontSize}px</span>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateRun(selection.key, selection.index, { fontSize: Math.min(120, runSelection.fontSize + 2) })}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Button labels, style, and SIZE */}
        <div className="grid gap-3 sm:grid-cols-2">
          {layout.buttons.map((b, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">Button {i + 1}</p>
              <input
                value={b.label}
                onChange={(e) => updateButton(i, { label: e.target.value })}
                className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none"
              />
              <div className="flex gap-2">
                <Select value={b.style} onValueChange={(v: 'primary' | 'secondary') => updateButton(i, { style: v })}>
                  <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary (filled)</SelectItem>
                    <SelectItem value="secondary">Secondary (outline)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={b.size} onValueChange={(v: BtnSize) => updateButton(i, { size: v })}>
                  <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <AlertDialog open={blocker.status === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>Save your hero section changes before leaving, or discard them.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>Cancel</Button>
            <Button variant="destructive" onClick={() => { discard(); blocker.proceed?.(); }}>Discard & Leave</Button>
            <Button onClick={async () => { const ok = await save(); if (ok) blocker.proceed?.(); }} className="bg-gold text-background hover:bg-gold/90">
              Save & Leave
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
