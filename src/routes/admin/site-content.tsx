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
import { Loader2, Upload, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES } from '@/data/locations';
import heroImg from '@/assets/hero-citadel.jpg';

export const Route = createFileRoute('/admin/site-content')({ component: SiteContentPage });

/* ============================== TYPES ============================== */

type FontFamily = 'display' | 'sans';

interface Run { text: string; color: string; fontSize: number; }
interface TextBlock { runs: Run[]; font: FontFamily; x: number; y: number; scale: number; }
interface ButtonBlock { label: string; x: number; y: number; style: 'primary' | 'secondary'; }

interface HeroLayout {
  eyebrow: TextBlock;
  headline: TextBlock;
  subheadline: TextBlock;
  buttons: ButtonBlock[];
}

interface HeroRow { id: number; layout: HeroLayout; }
interface CoverRow { category: string; image_url: string; }

type TextKey = 'eyebrow' | 'headline' | 'subheadline';
type Selection =
  | { kind: 'text'; key: TextKey }
  | { kind: 'run'; key: TextKey; index: number }
  | { kind: 'button'; index: number }
  | null;

const DRAG_THRESHOLD = 4; // px of movement before a pointerdown counts as a drag, not a click

function SiteContentPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Site Content</h1>
        <p className="text-sm text-muted-foreground">
          Double-click any sentence to edit its text. Single-click a word to style just that word.
          Drag to move, use arrow keys to nudge, and drag a corner handle to resize a whole sentence proportionally.
        </p>
      </div>
      <HeroEditor />
      <CategoryCoversEditor />
    </div>
  );
}

/* ============================== HERO EDITOR (CANVA-STYLE) ============================== */

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

  const canvasRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (data?.layout) {
      setLayout(data.layout);
      savedRef.current = JSON.stringify(data.layout);
    }
  }, [data]);

  const isDirty = !!layout && JSON.stringify(layout) !== savedRef.current;

  // Guard: browser refresh / tab close
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Guard: in-app navigation to another route
  const blocker = useBlocker({ shouldBlockFn: () => isDirty, withResolver: true } as any);

  async function save() {
    if (!layout) return;
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
    if (data?.layout) setLayout(JSON.parse(savedRef.current));
  }

  function updateBlock(key: TextKey, patch: Partial<TextBlock>) {
    setLayout((prev) => (prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev));
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

  function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

  /* ---------- Drag + click detection for text blocks & buttons ---------- */
  function onBlockPointerDown(target: { type: 'text'; key: TextKey } | { type: 'button'; index: number }) {
    return (e: React.PointerEvent) => {
      if (editingKey) return; // don't drag while typing
      e.stopPropagation();
      const canvas = canvasRef.current;
      if (!canvas || !layout) return;
      const rect = canvas.getBoundingClientRect();
      const startX = e.clientX, startY = e.clientY;
      const origin = target.type === 'text' ? layout[target.key] : layout.buttons[target.index];
      let moved = false;
      const clickedEl = e.target as HTMLElement;
      const runIndexAttr = clickedEl.closest('[data-run-index]')?.getAttribute('data-run-index');

      function onMove(ev: PointerEvent) {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) moved = true;
        if (!moved) return;
        const xPct = clamp(origin.x + (dx / rect.width) * 100, 0, 95);
        const yPct = clamp(origin.y + (dy / rect.height) * 100, 0, 95);
        if (target.type === 'text') updateBlock(target.key, { x: xPct, y: yPct });
        else updateButton(target.index, { x: xPct, y: yPct });
      }
      function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (!moved) {
          // it was a click, not a drag → select block or specific word run
          if (target.type === 'text' && runIndexAttr !== null && runIndexAttr !== undefined) {
            setSelection({ kind: 'run', key: target.key, index: Number(runIndexAttr) });
          } else if (target.type === 'text') {
            setSelection({ kind: 'text', key: target.key });
          } else {
            setSelection({ kind: 'button', index: target.index });
          }
        }
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  function onBlockDoubleClick(key: TextKey) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!layout) return;
      setSelection({ kind: 'text', key });
      setEditingKey(key);
      setDraftText(layout[key].runs.map((r) => r.text).join(' '));
    };
  }

  function commitEdit(key: TextKey) {
    setLayout((prev) => {
      if (!prev) return prev;
      const words = draftText.split(/\s+/).filter(Boolean);
      const oldRuns = prev[key].runs;
      const defaultStyle = oldRuns[oldRuns.length - 1] ?? { color: '#F5F0E6', fontSize: 20 };
      const runs: Run[] = words.length
        ? words.map((w, i) => ({
            text: w,
            color: oldRuns[i]?.color ?? defaultStyle.color,
            fontSize: oldRuns[i]?.fontSize ?? defaultStyle.fontSize,
          }))
        : [{ text: '', color: defaultStyle.color, fontSize: defaultStyle.fontSize }];
      return { ...prev, [key]: { ...prev[key], runs } };
    });
    setEditingKey(null);
  }

  /* ---------- Corner-handle resize (uniform scale, no distortion) ---------- */
  function onHandlePointerDown(key: TextKey, corner: 'nw' | 'ne' | 'sw' | 'se') {
    return (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const blockEl = blockRefs.current[key];
      if (!blockEl || !layout) return;
      const rect = blockEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const startDist = Math.hypot(e.clientX - cx, e.clientY - cy);
      const startScale = layout[key].scale;

      function onMove(ev: PointerEvent) {
        const dist = Math.hypot(ev.clientX - cx, ev.clientY - cy);
        const factor = dist / Math.max(startDist, 1);
        const newScale = clamp(startScale * factor, 0.4, 3.5);
        updateBlock(key, { scale: newScale });
      }
      function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  /* ---------- Keyboard nudge for the selected block ---------- */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (editingKey) return;
      if (!selection || selection.kind === 'run') return;
      const step = e.shiftKey ? 1 : 0.25;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;
      e.preventDefault();
      if (selection.kind === 'text') {
        setLayout((prev) => prev ? { ...prev, [selection.key]: { ...prev[selection.key], x: clamp(prev[selection.key].x + dx, 0, 95), y: clamp(prev[selection.key].y + dy, 0, 95) } } : prev);
      } else if (selection.kind === 'button') {
        setLayout((prev) => {
          if (!prev) return prev;
          const buttons = [...prev.buttons];
          buttons[selection.index] = { ...buttons[selection.index], x: clamp(buttons[selection.index].x + dx, 0, 95), y: clamp(buttons[selection.index].y + dy, 0, 95) };
          return { ...prev, buttons };
        });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selection, editingKey]);

  if (isLoading || !layout) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading hero content…
        </CardContent>
      </Card>
    );
  }

  const runSelection = selection?.kind === 'run' ? layout[selection.key].runs[selection.index] : null;

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
      <CardContent className="space-y-4">
        <div
          ref={canvasRef}
          onPointerDown={() => { setSelection(null); if (editingKey) commitEdit(editingKey); }}
          className="relative w-full select-none overflow-hidden rounded-2xl border border-border"
          style={{ aspectRatio: '1920 / 575' }}
        >
          <img src={heroImg} alt="Hero preview" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-black/25" />

          {(['eyebrow', 'headline', 'subheadline'] as TextKey[]).map((key) => {
            const block = layout[key];
            const isSelected = selection?.kind === 'text' && selection.key === key;
            const isEditing = editingKey === key;
            return (
              <div
                key={key}
                ref={(el) => (blockRefs.current[key] = el)}
                onPointerDown={onBlockPointerDown({ type: 'text', key })}
                onDoubleClick={onBlockDoubleClick(key)}
                className={`absolute cursor-move touch-none leading-[1.15] ${isSelected ? 'outline outline-2 outline-white/80 outline-offset-4' : ''}`}
                style={{ left: `${block.x}%`, top: `${block.y}%`, maxWidth: '80%' }}
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(key); }
                      if (e.key === 'Escape') { setEditingKey(null); }
                    }}
                    onBlur={() => commitEdit(key)}
                    className="min-w-[220px] rounded-md border-2 border-gold bg-black/80 p-2 text-white outline-none"
                    style={{ fontSize: `${(block.runs[0]?.fontSize ?? 16) * block.scale}px` }}
                    rows={2}
                  />
                ) : (
                  block.runs.map((r, i) => (
                    <span
                      key={i}
                      data-run-index={i}
                      className={`mr-2 inline-block font-bold ${block.font === 'display' ? 'font-display' : 'font-sans'} ${
                        selection?.kind === 'run' && selection.key === key && selection.index === i ? 'ring-2 ring-gold' : ''
                      }`}
                      style={{ color: r.color, fontSize: `${r.fontSize * block.scale}px` }}
                    >
                      {r.text}
                    </span>
                  ))
                )}

                {/* Corner resize handles — uniform scale only, never distorts */}
                {isSelected && !isEditing && (
                  <>
                    {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                      <div
                        key={corner}
                        onPointerDown={onHandlePointerDown(key, corner)}
                        className="absolute h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-white bg-gold"
                        style={{
                          top: corner.startsWith('n') ? -6 : undefined,
                          bottom: corner.startsWith('s') ? -6 : undefined,
                          left: corner.endsWith('w') ? -6 : undefined,
                          right: corner.endsWith('e') ? -6 : undefined,
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}

          {layout.buttons.map((b, i) => {
            const isSelected = selection?.kind === 'button' && selection.index === i;
            return (
              <div
                key={i}
                onPointerDown={onBlockPointerDown({ type: 'button', index: i })}
                className={`absolute flex cursor-move touch-none items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold ${
                  b.style === 'primary' ? 'bg-primary text-primary-foreground' : 'border border-white/40 bg-black/30 text-white backdrop-blur'
                } ${isSelected ? 'outline outline-2 outline-white/80 outline-offset-2' : ''}`}
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
              >
                {b.label}
              </div>
            );
          })}
        </div>

        {/* Floating style toolbar for a selected word */}
        {runSelection && selection?.kind === 'run' && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
            <p className="text-xs font-semibold">Selected word: "{runSelection.text}"</p>
            <input
              type="color"
              value={runSelection.color}
              onChange={(e) => updateRun(selection.key, selection.index, { color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-input"
            />
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

        {/* Button label quick-edit (double-click on canvas buttons isn't wired for typing, so edit text here) */}
        <div className="grid gap-2 sm:grid-cols-2">
          {layout.buttons.map((b, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border p-2">
              <span className="text-[11px] text-muted-foreground">Button {i + 1}:</span>
              <input
                value={b.label}
                onChange={(e) => updateButton(i, { label: e.target.value })}
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Double-click a sentence to type. Single-click a word to color/resize just that word. Drag anywhere, or select and use arrow keys (hold Shift for bigger steps). Drag a gold corner handle to scale a whole sentence proportionally.
        </p>
      </CardContent>

      {/* Unsaved-changes guard when leaving the page */}
      <AlertDialog open={blocker.status === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to the hero section. Save them before leaving, or discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { discard(); blocker.proceed?.(); }}
            >
              Discard & Leave
            </Button>
            <Button
              onClick={async () => { const ok = await save(); if (ok) blocker.proceed?.(); }}
              className="bg-gold text-background hover:bg-gold/90"
            >
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
