import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
}

// Full-screen image viewer. Click the backdrop, press the X, or hit
// Escape to close. With more than one image it also gets prev/next
// arrows, a counter, and left/right arrow-key navigation.
//
// Rendered via a portal straight into <body>, outside the page's own
// DOM tree. Third-party widgets (Leaflet maps, dropdowns, etc.) often
// set very high internal z-index values on their own elements — a
// portal plus a max z-index here means this overlay always wins,
// regardless of what any of those set.
export function ImageLightbox({ images, index, onClose }: ImageLightboxProps) {
  const [current, setCurrent] = useState(index);

  useEffect(() => setCurrent(index), [index]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (images.length > 1 && e.key === 'ArrowLeft') goPrev();
      if (images.length > 1 && e.key === 'ArrowRight') goNext();
    }
    document.addEventListener('keydown', onKey);
    // Freeze the page behind the overlay while it's open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, goPrev, goNext, images.length]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 flex items-center justify-center bg-black/95 p-4"
      style={{ zIndex: 2147483647 }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 md:left-4"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="Next image"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 md:right-4"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {current + 1} / {images.length}
          </div>
        </>
      )}

      <img
        src={images[current]}
        alt=""
        className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
