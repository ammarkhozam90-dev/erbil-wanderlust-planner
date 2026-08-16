import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/import')({ component: BulkImport });

const CATEGORIES = ['restaurant', 'cafe', 'hotel', 'attraction', 'shop', 'activity', 'other'];
const PRICE_LEVELS = ['$', '$$', '$$$', '$$$$'];

interface Row {
  raw: Record<string, string>;
  errors: string[];
}

// Minimal CSV parser — handles quoted fields containing commas, without
// pulling in an extra dependency for a single admin-only tool.
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  function parseLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }
  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
    return row;
  });
  return { headers, rows };
}

function splitList(v: string | undefined): string[] {
  return (v ?? '').split(';').map((s) => s.trim()).filter(Boolean);
}

function validateRow(r: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!r.name?.trim()) errors.push('Missing name');
  if (!r.category?.trim() || !CATEGORIES.includes(r.category.trim())) {
    errors.push(`Category must be one of: ${CATEGORIES.join(', ')}`);
  }
  if (r.price_level && !PRICE_LEVELS.includes(r.price_level.trim())) {
    errors.push(`Price level must be one of: ${PRICE_LEVELS.join(', ')}`);
  }
  if (r.latitude && isNaN(Number(r.latitude))) errors.push('Latitude is not a number');
  if (r.longitude && isNaN(Number(r.longitude))) errors.push('Longitude is not a number');
  if (r.avg_duration_minutes && isNaN(Number(r.avg_duration_minutes))) errors.push('Duration is not a number');
  return errors;
}

function BulkImport() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const { rows: parsed } = parseCsv(String(reader.result));
      setRows(parsed.map((raw) => ({ raw, errors: validateRow(raw) })));
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const validCount = rows.filter((r) => r.errors.length === 0).length;

  async function runImport() {
    setImporting(true);
    let ok = 0, failed = 0;
    const { data: u } = await supabase.auth.getUser();

    for (const row of rows) {
      if (row.errors.length > 0) { failed++; continue; }
      const r = row.raw;
      const { error } = await supabase.from('merchants').insert({
        owner_id: null,
        claim_status: 'unclaimed',
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: u.user?.id,
        name: r.name,
        category: r.category,
        description: r.description || null,
        phone: r.phone || null,
        email: r.email || null,
        website: r.website || null,
        address: r.address || null,
        city: r.city || null,
        latitude: r.latitude ? Number(r.latitude) : null,
        longitude: r.longitude ? Number(r.longitude) : null,
        instagram: r.instagram || null,
        facebook: r.facebook || null,
        tiktok: r.tiktok || null,
        whatsapp: r.whatsapp || null,
        mood_tags: splitList(r.mood_tags),
        best_visit_time: splitList(r.best_visit_time),
        avg_duration_minutes: r.avg_duration_minutes ? Number(r.avg_duration_minutes) : null,
        price_level: r.price_level || null,
        suitability: splitList(r.suitability),
        transportation: splitList(r.transportation),
        features: splitList(r.features),
        dietary_options: splitList(r.dietary_options),
      } as any);
      if (error) failed++; else ok++;
    }

    setImporting(false);
    setResult({ ok, failed });
    qc.invalidateQueries({ queryKey: ['admin-businesses'] });
    if (ok > 0) toast.success(`Imported ${ok} listing(s)`);
    if (failed > 0) toast.error(`${failed} row(s) failed`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Bulk Import Businesses</h1>
        <p className="text-sm text-muted-foreground">
          Seed the ErbilGo database with unclaimed listings. Owners can find and claim them later from the merchant portal.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Get the template</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Fill this CSV in a spreadsheet app, then upload it below. Separate multiple tags in the same cell with a semicolon (e.g. <code>Relaxing;Nature</code>).
          </p>
          <a href="/business_import_template.csv" download>
            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download CSV template</Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Upload &amp; review</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" /> {fileName || 'Choose CSV file'}
            <input type="file" accept=".csv" className="hidden" onChange={onFile} />
          </label>

          {rows.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Badge className="bg-green-500/10 text-green-700">{validCount} ready to import</Badge>
                {rows.length - validCount > 0 && (
                  <Badge className="bg-destructive/10 text-destructive">{rows.length - validCount} have errors</Badge>
                )}
              </div>

              <div className="max-h-96 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2">Status</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">City</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2">
                          {r.errors.length === 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="flex items-center gap-1 text-destructive">
                              <AlertCircle className="h-4 w-4" /> {r.errors.join('; ')}
                            </span>
                          )}
                        </td>
                        <td className="p-2">{r.raw.name || '—'}</td>
                        <td className="p-2 capitalize">{r.raw.category || '—'}</td>
                        <td className="p-2">{r.raw.city || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button onClick={runImport} disabled={importing || validCount === 0}>
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Import {validCount} listing{validCount === 1 ? '' : 's'}
              </Button>

              {result && (
                <p className="text-sm text-muted-foreground">
                  Done — {result.ok} imported, {result.failed} failed.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
