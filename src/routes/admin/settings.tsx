import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logActivity } from '@/components/admin/log-activity';

export const Route = createFileRoute('/admin/settings')({ component: Settings });

function Settings() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => (await supabase.from('app_settings').select('*')).data ?? [],
  });
  const site = q.data?.find((r: any) => r.key === 'site')?.value ?? {};
  const homepage = q.data?.find((r: any) => r.key === 'homepage')?.value ?? {};

  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [lang, setLang] = useState(''); const [maxFeatured, setMaxFeatured] = useState(6);
  const [maxRecent, setMaxRecent] = useState(12);

  useEffect(() => {
    setName(site.name ?? ''); setEmail(site.contact_email ?? '');
    setLang(site.language ?? 'en'); setMaxFeatured(homepage.max_featured_categories ?? 6);
    setMaxRecent(homepage.max_recent_businesses ?? 12);
  }, [q.data]);

  async function save() {
    const rows = [
      { key: 'site', value: { name, contact_email: email, language: lang } },
      { key: 'homepage', value: { max_featured_categories: maxFeatured, max_recent_businesses: maxRecent } },
    ];
    const { error } = await supabase.from('app_settings').upsert(rows as any);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'settings.updated', target_type: 'settings' });
    toast.success('Saved'); qc.invalidateQueries({ queryKey: ['app-settings'] });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Site</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Website name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Contact email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Default language</Label><Input value={lang} onChange={(e) => setLang(e.target.value)} placeholder="en" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Homepage limits</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Max featured categories</Label><Input type="number" value={maxFeatured} onChange={(e) => setMaxFeatured(Number(e.target.value))} /></div>
          <div><Label>Max recent businesses</Label><Input type="number" value={maxRecent} onChange={(e) => setMaxRecent(Number(e.target.value))} /></div>
          <p className="text-xs text-muted-foreground">Featured categories are toggled on the Categories page.</p>
        </CardContent>
      </Card>
      <Button onClick={save}>Save changes</Button>
    </div>
  );
}
