import { useState } from 'react';
import { MapPicker } from '@/components/merchant/MapPicker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { parseGoogleMapsLink } from '@/lib/google-maps-link';
import { toast } from 'sonner';

export function LocationPicker({ lat, lng, onChange }:
  { lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void }) {
  const [link, setLink] = useState('');

  function useLink() {
    const parsed = parseGoogleMapsLink(link);
    if (!parsed) {
      return toast.error('Could not read coordinates from that link — paste the full Google Maps URL from the address bar (not a shortened maps.app.goo.gl link).');
    }
    onChange(parsed.lat, parsed.lng);
    setLink('');
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={link}
          placeholder="Paste a Google Maps link here…"
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); useLink(); } }}
        />
        <Button type="button" variant="outline" onClick={useLink}>Use link</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Or click/drag the pin directly on the map below.
      </p>
      <div className="h-56 overflow-hidden rounded-lg border">
        <MapPicker lat={lat} lng={lng} onChange={onChange} />
      </div>
    </div>
  );
}
