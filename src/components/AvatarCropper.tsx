import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/compress-image';

const CROP_SIZE = 280; // display size of the circular crop viewport, in px
const OUTPUT_SIZE = 480; // exported image resolution (still small once compressed)

interface AvatarCropperProps {
  file: File | null;
  onClose: () => void;
  onCropped: (blob: Blob) => void;
}

export function AvatarCropper({ file, onClose, onCropped }: AvatarCropperProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!objectUrl) return;
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
    };
    image.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const baseScale = img ? CROP_SIZE / Math.min(img.width, img.height) : 1;
  const displayScale = baseScale * zoom;
  const displayW = img ? img.width * displayScale : 0;
  const displayH = img ? img.height * displayScale : 0;

  // Center only when a NEW image is loaded — zooming afterwards (wheel or
  // slider) should keep the current pan position (just clamped so no gaps
  // appear), not snap back to center on every tick.
  useEffect(() => {
    if (!img) return;
    const base = CROP_SIZE / Math.min(img.width, img.height);
    setPan({ x: (CROP_SIZE - img.width * base) / 2, y: (CROP_SIZE - img.height * base) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  useEffect(() => {
    if (!img) return;
    setPan((p) => clampPan(p.x, p.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  function clampPan(x: number, y: number) {
    const minX = Math.min(0, CROP_SIZE - displayW);
    const minY = Math.min(0, CROP_SIZE - displayH);
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.002)));
  }

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    function onMove(ev: PointerEvent) {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPan(clampPan(dragRef.current.panX + dx, dragRef.current.panY + dy));
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  async function handleSave() {
    if (!img) return;
    setSaving(true);
    try {
      // Map the visible crop circle back to natural image pixel coordinates.
      const srcX = (0 - pan.x) / displayScale;
      const srcY = (0 - pan.y) / displayScale;
      const srcSize = CROP_SIZE / displayScale;

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const rawBlob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Crop failed'))), 'image/jpeg', 0.92),
      );
      const compressed = await compressImage(rawBlob, { maxSizeKB: 150, maxDimension: OUTPUT_SIZE });
      onCropped(compressed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust your photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            onPointerDown={onPointerDown}
            onWheel={onWheel}
            className="relative touch-none overflow-hidden rounded-full border-2 border-gold/60 bg-muted"
            style={{ width: CROP_SIZE, height: CROP_SIZE, cursor: 'grab' }}
          >
            {img && (
              <img
                src={img.src}
                alt="Crop preview"
                draggable={false}
                className="absolute select-none"
                style={{
                  width: displayW,
                  height: displayH,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  left: pan.x,
                  top: pan.y,
                }}
              />
            )}
          </div>

          <div className="flex w-full items-center gap-3">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <Slider min={1} max={4} step={0.05} value={[zoom]} onValueChange={([v]) => setZoom(v)} />
          </div>
          <p className="text-[11px] text-muted-foreground">Drag to reposition. Scroll/pinch or use the slider to zoom.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!img || saving} className="bg-gold text-background hover:bg-gold/90">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
