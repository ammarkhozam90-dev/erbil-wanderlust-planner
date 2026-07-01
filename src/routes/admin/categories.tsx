import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { logActivity } from '@/components/admin/log-activity';
import { useState } from 'react';

export const Route = createFileRoute('/admin/categories')({ component: Categories });

interface Category {
  id: string; slug: string; name: string; icon: string | null;
  sort_order: number; enabled: boolean; featured: boolean;
}

function Categories() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order');
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  async function update(c: Category, patch: Partial<Category>) {
    const { error } = await supabase.from('categories').update(patch as any).eq('id', c.id);
    if (error) return toast.error(error.message);
    await logActivity({ action: 'category.updated', target_type: 'category', target_id: c.id, target_label: c.name, metadata: patch as any });
    qc.invalidateQueries({ queryKey: ['admin-categories'] });
  }

  async function move(c: Category, dir: -1 | 1) {
    await update(c, { sort_order: c.sort_order + dir });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Categories</h1>
        <p className="text-sm text-muted-foreground">Enable, order, and feature categories displayed on the site.</p>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {list.data?.map((c) => <Row key={c.id} c={c} update={update} move={move} />)}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ c, update, move }: { c: Category; update: (c: Category, p: Partial<Category>) => void; move: (c: Category, d: -1 | 1) => void }) {
  const [icon, setIcon] = useState(c.icon ?? '');
  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-40 font-medium">{c.name} <span className="text-xs text-muted-foreground">/{c.slug}</span></div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Icon</span>
        <Input value={icon} onChange={(e) => setIcon(e.target.value)} onBlur={() => icon !== c.icon && update(c, { icon })} className="h-8 w-32" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Enabled</span>
        <Switch checked={c.enabled} onCheckedChange={(v) => update(c, { enabled: v })} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Featured</span>
        <Switch checked={c.featured} onCheckedChange={(v) => update(c, { featured: v })} />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={() => move(c, -1)}>↑</Button>
        <Button size="sm" variant="outline" onClick={() => move(c, 1)}>↓</Button>
        <span className="ml-2 text-xs text-muted-foreground">Order {c.sort_order}</span>
      </div>
    </div>
  );
}
