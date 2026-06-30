import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { useMyMerchant } from '@/components/merchant/use-my-merchant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Globe, Clock, DollarSign } from 'lucide-react';

export const Route = createFileRoute('/merchant/_authenticated/preview')({
  component: Preview,
});

function Preview() {
  const { user } = useAuth();
  const { data: m } = useMyMerchant(user?.id);
  if (!m) return <div className="text-muted-foreground">No data.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="font-display text-2xl font-bold">Preview</h2>
      <p className="text-sm text-muted-foreground">How travelers will see your listing.</p>

      <Card className="overflow-hidden">
        {m.cover_url && <img src={m.cover_url} alt="" className="h-56 w-full object-cover" />}
        <CardHeader className="flex flex-row items-center gap-4">
          {m.logo_url && <img src={m.logo_url} alt="" className="h-16 w-16 rounded object-cover" />}
          <div>
            <CardTitle className="text-2xl">{m.name || 'Untitled business'}</CardTitle>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="capitalize">{m.category}</Badge>
              {m.price_level && <span className="flex items-center"><DollarSign className="h-3 w-3" />{m.price_level}</span>}
              {m.avg_duration_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.avg_duration_minutes} min</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {m.description && <p className="text-sm">{m.description}</p>}
          <div className="space-y-1 text-sm">
            {m.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{m.address}</div>}
            {m.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />{m.phone}</div>}
            {m.website && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />{m.website}</div>}
          </div>
          {m.features?.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Features</div>
              <div className="flex flex-wrap gap-1.5">
                {m.features.map((f) => <Badge key={f} variant="outline">{f}</Badge>)}
              </div>
            </div>
          )}
          {m.mood_tags?.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Mood</div>
              <div className="flex flex-wrap gap-1.5">
                {m.mood_tags.map((t) => <Badge key={t} className="capitalize">{t}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
