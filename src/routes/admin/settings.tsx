import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, Megaphone, Home, Sparkles, Store, Search, Wrench, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logActivity } from '@/components/admin/log-activity';
import {
  DEFAULT_SETTINGS, SETTINGS_KEY, fetchSiteSettings, type SiteSettings,
} from '@/lib/site-settings';

export const Route = createFileRoute('/admin/settings')({ component: Settings });

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, description, children }: {
  icon: any; title: string; description: string; children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-gold" /> {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Settings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['site-settings'], queryFn: fetchSiteSettings });
  const [s, setS] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const saved = useRef('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.data) { setS(q.data); saved.current = JSON.stringify(q.data); }
  }, [q.data]);

  const dirty = JSON.stringify(s) !== saved.current;

  function set<G extends keyof SiteSettings>(group: G, patch: Partial<SiteSettings[G]>) {
    setS((prev) => ({ ...prev, [group]: { ...prev[group], ...patch } }));
  }

  async function save() {
    if (s.announcement.link_url && !/^(https?:\/\/|\/|mailto:)/.test(s.announcement.link_url)) {
      return toast.error('Announcement link must start with https://, / or mailto:');
    }
    setBusy(true);
    const { error } = await supabase
      .from('app_settings' as any)
      .upsert({ key: SETTINGS_KEY, value: s, updated_at: new Date().toISOString() } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'settings.updated', target_type: 'settings' }).catch(() => undefined);
    saved.current = JSON.stringify(s);
    toast.success('Settings saved — live on the site now');
    qc.invalidateQueries({ queryKey: ['site-settings'] });
  }

  if (q.isLoading) {
    return <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading settings…</div>;
  }

  return (
    <div className="max-w-3xl space-y-6 pb-24">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Every option here is live: saving changes the public site immediately.
        </p>
      </div>

      <Section icon={Wrench} title="Site status" description="Maintenance mode and the announcement bar.">
        <Row label="Maintenance mode" hint="Visitors see a maintenance page. Admins can still use the site.">
          <Switch checked={s.maintenance.enabled} onCheckedChange={(v) => set('maintenance', { enabled: v })} />
        </Row>
        {s.maintenance.enabled && (
          <Field label="Maintenance message">
            <Textarea rows={2} value={s.maintenance.message} onChange={(e) => set('maintenance', { message: e.target.value })} />
          </Field>
        )}
        <Row label="Announcement bar" hint="A slim banner at the top of every public page.">
          <Switch checked={s.announcement.enabled} onCheckedChange={(v) => set('announcement', { enabled: v })} />
        </Row>
        {s.announcement.enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Text"><Input value={s.announcement.text} onChange={(e) => set('announcement', { text: e.target.value })} placeholder="New: Plan your Eid weekend in Erbil" /></Field>
            </div>
            <Field label="Link label (optional)"><Input value={s.announcement.link_label} onChange={(e) => set('announcement', { link_label: e.target.value })} /></Field>
            <Field label="Link URL (optional)"><Input value={s.announcement.link_url} onChange={(e) => set('announcement', { link_url: e.target.value })} placeholder="/plan or https://…" /></Field>
            <Field label="Style">
              <Select value={s.announcement.tone} onValueChange={(v: any) => set('announcement', { tone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (gold)</SelectItem>
                  <SelectItem value="promo">Promo (filled)</SelectItem>
                  <SelectItem value="warning">Warning (red)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}
      </Section>

      <Section icon={Globe} title="Brand & contact" description="Shown in the public footer.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact email"><Input type="email" value={s.brand.contact_email} onChange={(e) => set('brand', { contact_email: e.target.value })} /></Field>
          <Field label="Partnerships email"><Input type="email" value={s.brand.partner_email} onChange={(e) => set('brand', { partner_email: e.target.value })} /></Field>
          <Field label="Instagram URL"><Input value={s.brand.instagram} onChange={(e) => set('brand', { instagram: e.target.value })} placeholder="https://instagram.com/…" /></Field>
          <Field label="Facebook URL"><Input value={s.brand.facebook} onChange={(e) => set('brand', { facebook: e.target.value })} placeholder="https://facebook.com/…" /></Field>
          <Field label="WhatsApp number" hint="International format, digits only. Example: 9647501234567">
            <Input value={s.brand.whatsapp} onChange={(e) => set('brand', { whatsapp: e.target.value.replace(/[^\d]/g, '') })} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">Leave a link empty to hide its icon.</p>
      </Section>

      <Section icon={Home} title="Homepage" description="Choose which sections visitors see.">
        <Row label="Curated Journeys"><Switch checked={s.homepage.show_journeys} onCheckedChange={(v) => set('homepage', { show_journeys: v })} /></Row>
        <Row label="Sponsored / Featured businesses"><Switch checked={s.homepage.show_featured} onCheckedChange={(v) => set('homepage', { show_featured: v })} /></Row>
        <Row label="Signature Experience" hint="Static showcase block."><Switch checked={s.homepage.show_signature} onCheckedChange={(v) => set('homepage', { show_signature: v })} /></Row>
        <Row label="Explore by Interest"><Switch checked={s.homepage.show_categories} onCheckedChange={(v) => set('homepage', { show_categories: v })} /></Row>
        <Field label="Businesses shown in the featured section" hint="Between 3 and 12.">
          <Input type="number" min={3} max={12} className="w-28" value={s.homepage.featured_count}
            onChange={(e) => set('homepage', { featured_count: Math.min(12, Math.max(3, Number(e.target.value) || 6)) })} />
        </Field>
      </Section>

      <Section icon={Sparkles} title="Plan My Day" description="Control the planner engine.">
        <Row label="Planner enabled" hint="When off, /plan shows a 'coming back soon' message.">
          <Switch checked={s.planner.enabled} onCheckedChange={(v) => set('planner', { enabled: v })} />
        </Row>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Max stops per plan" hint="0 = automatic, based on the day length.">
            <Input type="number" min={0} max={8} className="w-28" value={s.planner.max_stops}
              onChange={(e) => set('planner', { max_stops: Math.min(8, Math.max(0, Number(e.target.value) || 0)) })} />
          </Field>
          <Field label="Plan variety" hint="How many top matches the engine picks from.">
            <Select value={String(s.planner.variety)} onValueChange={(v) => set('planner', { variety: Number(v) as 1 | 2 | 3 })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Always the best match</SelectItem>
                <SelectItem value="2">Top 2 (some variety)</SelectItem>
                <SelectItem value="3">Top 3 (most variety)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section icon={Store} title="Merchants" description="Control new business sign-ups.">
        <Row label="Accept new business registrations" hint="Existing merchants are never affected.">
          <Switch checked={s.merchants.registrations_open} onCheckedChange={(v) => set('merchants', { registrations_open: v })} />
        </Row>
        {!s.merchants.registrations_open && (
          <Field label="Message shown to new businesses">
            <Textarea rows={2} value={s.merchants.closed_message} onChange={(e) => set('merchants', { closed_message: e.target.value })} />
          </Field>
        )}
      </Section>

      <Section icon={Search} title="SEO (homepage)" description="Search & social sharing. Leave empty to keep the built-in defaults.">
        <Field label="Title" hint={`${s.seo.title.length}/60`}><Input maxLength={70} value={s.seo.title} onChange={(e) => set('seo', { title: e.target.value })} /></Field>
        <Field label="Description" hint={`${s.seo.description.length}/160`}><Textarea rows={2} maxLength={180} value={s.seo.description} onChange={(e) => set('seo', { description: e.target.value })} /></Field>
        <Field label="Share image URL" hint="Shown when the link is shared (recommended 1200×630)."><Input value={s.seo.og_image} onChange={(e) => set('seo', { og_image: e.target.value })} placeholder="https://…" /></Field>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:left-[var(--sidebar-width,16rem)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!dirty || busy} onClick={() => setS(JSON.parse(saved.current))}>Discard</Button>
            <Button size="sm" disabled={!dirty || busy} onClick={save} className="bg-gold text-background hover:bg-gold/90">
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
