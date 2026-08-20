import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn } from 'lucide-react';
import { cropToBlob } from '@/lib/crop-image';

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  aspect: number;
  title: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

// Drag to reposition, slider (or pinch/scroll) to zoom — same interaction
// pattern as AvatarCropper, generalized to any aspect ratio so it covers
// both the square logo and the wide cover image.
export function ImageCropDialog({ open, imageSrc, aspect, title, onCancel, onConfirm }: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  // Reset position/zoom each time a new image is opened, so a leftover
  // position from a previous edit doesn't carry over.
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await cropToBlob(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } catch {
      // Swallow — the parent's own upload error handling will still fire
      // on the eventual upload attempt if something is genuinely wrong.
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>

        {imageSrc && (
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape="rect"
              showGrid={false}
              minZoom={1}
              maxZoom={4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Slider min={1} max={4} step={0.01} value={[zoom]} onValueChange={([v]) => setZoom(v)} />
        </div>
        <p className="text-xs text-muted-foreground">Drag the image to reposition it, use the slider to zoom.</p>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={processing}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={processing || !croppedAreaPixels}>
            {processing ? 'Applying…' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
