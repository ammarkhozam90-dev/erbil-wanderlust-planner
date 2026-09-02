import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/compress-image";

export const Route = createFileRoute("/admin/import")({ component: BulkImport });

const CATEGORIES = ["restaurant", "cafe", "hotel", "attraction", "shop", "activity", "other"];
const PRICE_LEVELS = ["$", "$$", "$$$", "$$$$"];

interface Row {
  raw: Record<string, string>;
  errors: string[];
  mode?: "new" | "update";
  existingId?: string;
  missingFields?: string[];
}

type MediaKind = "logo" | "cover" | "gallery";

type MediaFile = {
  file: File;
  businessKey: string;
  kind: MediaKind;
};

// Minimal CSV parser — handles quoted fields containing commas, without
// pulling in an extra dependency for a single admin-only tool.
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  function parseLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') inQuotes = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") {
          out.push(cur);
          cur = "";
        } else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }
  const headers = parseLine(lines[0]).map((h, index) =>
    (index === 0 ? h.replace(/^\uFEFF/, "") : h).trim(),
  );
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? "").trim();
    });
    return row;
  });
  return { headers, rows };
}

function splitList(v: string | undefined): string[] {
  return (v ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseJsonArray(v: string | undefined): unknown[] {
  if (!v?.trim()) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseBoolean(v: string | undefined): boolean {
  return ["true", "1", "yes", "y"].includes((v ?? "").trim().toLowerCase());
}

function normalizeBusinessName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\\s+/g, " ")
    .toLocaleLowerCase();
}

function isMissingValue(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0);
}

function merchantPayload(r: Record<string, string>) {
  return {
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
  };
}

function missingMerchantFields(existing: Record<string, unknown>, candidate: Record<string, unknown>): string[] {
  return Object.keys(candidate).filter((field) => !isMissingValue(candidate[field]) && isMissingValue(existing[field]));
}

function validateRow(r: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!r.name?.trim()) errors.push("Missing name");
  if (!r.category?.trim() || !CATEGORIES.includes(r.category.trim())) {
    errors.push(`Category must be one of: ${CATEGORIES.join(", ")}`);
  }
  if (r.price_level && !PRICE_LEVELS.includes(r.price_level.trim())) {
    errors.push(`Price level must be one of: ${PRICE_LEVELS.join(", ")}`);
  }
  if (r.latitude && isNaN(Number(r.latitude))) errors.push("Latitude is not a number");
  if (r.longitude && isNaN(Number(r.longitude))) errors.push("Longitude is not a number");
  if (r.avg_duration_minutes && isNaN(Number(r.avg_duration_minutes)))
    errors.push("Duration is not a number");
  if (r.category.trim() === "hotel") {
    if (
      r.hotel_star_rating &&
      (isNaN(Number(r.hotel_star_rating)) ||
        Number(r.hotel_star_rating) < 1 ||
        Number(r.hotel_star_rating) > 5)
    ) {
      errors.push("Hotel star rating must be between 1 and 5");
    }
    if (r.hotel_check_in_time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.hotel_check_in_time.trim())) {
      errors.push("Hotel check-in time must use HH:MM");
    }
    if (
      r.hotel_check_out_time &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.hotel_check_out_time.trim())
    ) {
      errors.push("Hotel check-out time must use HH:MM");
    }
    if (r.room_types_json?.trim()) {
      try {
        if (!Array.isArray(JSON.parse(r.room_types_json)))
          errors.push("room_types_json must be a JSON array");
      } catch {
        errors.push("room_types_json contains invalid JSON");
      }
    }
  }
  return errors;
}

function mediaClassification(file: File): { businessKey: string; kind: MediaKind } | null {
  if (!file.type.startsWith("image/")) return null;
  const relativePath = file.webkitRelativePath || file.name;
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts[parts.length - 1] ?? file.name;
  const stem = fileName.replace(/\.[^.]+$/, "");
  const pathWithoutFile = parts.slice(0, -1);
  const folderKind = pathWithoutFile[pathWithoutFile.length - 1]?.toLowerCase();
  const folderBusiness = pathWithoutFile.find(
    (part) => !["gallery", "photos"].includes(part.toLowerCase()),
  );

  if (["logo", "cover", "gallery"].includes(folderKind ?? "") && folderBusiness) {
    return { businessKey: folderBusiness.trim(), kind: folderKind as MediaKind };
  }

  const match = stem.match(/^(.+?)__(logo|cover|gallery)(?:__\d+)?$/i);
  if (!match) return null;
  return { businessKey: match[1].trim(), kind: match[2].toLowerCase() as MediaKind };
}

function BulkImport() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);
  const [mediaImporting, setMediaImporting] = useState(false);
  const [mediaResult, setMediaResult] = useState<{ ok: number; failed: number } | null>(null);

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
    e.target.value = "";
  }

  function onMediaFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const classified = files.flatMap((file) => {
      const classification = mediaClassification(file);
      return classification ? [{ file, ...classification }] : [];
    });
    setMediaFiles(classified);
    setMediaResult(null);
    e.target.value = "";
  }

  const validCount = rows.filter((r) => r.errors.length === 0).length;

  async function runMediaImport() {
    if (mediaFiles.length === 0) return;
    setMediaImporting(true);
    let ok = 0;
    let failed = 0;

    try {
      const { data: businesses, error: businessesError } = await supabase
        .from("merchants")
        .select("id, name")
        .eq("status", "approved");
      if (businessesError) throw businessesError;

      const byName = new Map(
        (businesses ?? []).map((business) => [business.name.trim().toLowerCase(), business]),
      );
      const grouped = new Map<string, MediaFile[]>();
      for (const media of mediaFiles) {
        const key = media.businessKey.trim().toLowerCase();
        grouped.set(key, [...(grouped.get(key) ?? []), media]);
      }

      for (const [businessKey, files] of grouped) {
        const business = byName.get(businessKey);
        if (!business) {
          failed += files.length;
          continue;
        }

        const galleryRows: { merchant_id: string; url: string; sort_order: number }[] = [];
        let galleryOrder = 0;
        for (const media of files) {
          try {
            let toUpload: Blob = media.file;
            try {
              toUpload = await compressImage(media.file, { maxSizeKB: 350, maxDimension: 1920 });
            } catch {
              // Keep the original image when client-side compression cannot decode it.
            }
            const safeName = media.file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
            const path = `admin/${business.id}/bulk-${media.kind}-${Date.now()}-${safeName}`;
            const { error: uploadError } = await supabase.storage
              .from("merchant-media")
              .upload(path, toUpload, {
                contentType: media.file.type || "image/jpeg",
                upsert: false,
              });
            if (uploadError) throw uploadError;
            const { data: publicUrl } = supabase.storage.from("merchant-media").getPublicUrl(path);

            if (media.kind === "logo" || media.kind === "cover") {
              const { error: updateError } = await supabase
                .from("merchants")
                .update({ [`${media.kind}_url`]: publicUrl.publicUrl })
                .eq("id", business.id);
              if (updateError) throw updateError;
            } else {
              galleryRows.push({
                merchant_id: business.id,
                url: publicUrl.publicUrl,
                sort_order: galleryOrder++,
              });
            }
            ok++;
          } catch {
            failed++;
          }
        }

        if (galleryRows.length > 0) {
          const { error: galleryError } = await supabase
            .from("merchant_photos")
            .insert(galleryRows);
          if (galleryError) failed += galleryRows.length;
        }
      }

      setMediaResult({ ok, failed });
      setMediaFiles([]);
      await qc.invalidateQueries({ queryKey: ["admin-businesses"] });
      if (ok > 0) toast.success(`Uploaded ${ok} image${ok === 1 ? "" : "s"}`);
      if (failed > 0) toast.error(`${failed} image${failed === 1 ? "" : "s"} failed`);
    } catch (error: any) {
      toast.error(error?.message ?? "Could not import images.");
    } finally {
      setMediaImporting(false);
    }
  }

  async function runImport() {
    setImporting(true);
    let ok = 0,
      failed = 0;
    const { data: u } = await supabase.auth.getUser();

    for (const row of rows) {
      if (row.errors.length > 0) {
        failed++;
        continue;
      }
      const r = row.raw;
      const { data: inserted, error } = await supabase
        .from("merchants")
        .insert({
          owner_id: null,
          claim_status: "unclaimed",
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: u.user?.id,
          name: r.name,
          category: r.category,
          categories: [r.category],
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
        } as any)
        .select("id")
        .single();
      if (error || !inserted) {
        failed++;
        continue;
      }

      if (r.category.trim() === "hotel") {
        const { error: hotelError } = await supabase.from("hotel_profiles" as any).upsert(
          {
            merchant_id: inserted.id,
            star_rating: r.hotel_star_rating ? Number(r.hotel_star_rating) : null,
            check_in_time: r.hotel_check_in_time || null,
            check_out_time: r.hotel_check_out_time || null,
            amenities: splitList(r.hotel_amenities),
            breakfast_available: parseBoolean(r.breakfast_available),
            airport_transfer_available: parseBoolean(r.airport_transfer_available),
            parking_available: parseBoolean(r.parking_available),
            cancellation_policy: r.cancellation_policy || null,
            affiliate_booking_url: r.affiliate_booking_url || null,
            whatsapp_booking_enabled: parseBoolean(r.whatsapp_booking_enabled),
            room_types: parseJsonArray(r.room_types_json),
          },
          { onConflict: "merchant_id" },
        );
        if (hotelError) {
          await supabase.from("merchants").delete().eq("id", inserted.id);
          failed++;
          continue;
        }
      }
      ok++;
    }

    setImporting(false);
    setResult({ ok, failed });
    qc.invalidateQueries({ queryKey: ["admin-businesses"] });
    if (ok > 0) toast.success(`Imported ${ok} listing(s)`);
    if (failed > 0) toast.error(`${failed} row(s) failed`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Bulk Import Businesses</h1>
        <p className="text-sm text-muted-foreground">
          Seed the ErbilGo database with unclaimed listings. Owners can find and claim them later
          from the merchant portal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Get the template</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Fill this CSV in a spreadsheet app, then upload it below. Separate multiple tags in the
            same cell with a semicolon (e.g. <code>Relaxing;Nature</code>). For hotels, use the
            hotel columns and place room definitions in <code>room_types_json</code> as a JSON
            array.
          </p>
          <a href="/business_import_template.csv" download>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download CSV template
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Bulk media (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload images by business folder. The folder must match the approved business name, with
            subfolders named <code>logo</code>, <code>cover</code>, or <code>gallery</code>.
          </p>
          <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-xs text-muted-foreground">
            Example: <code>Erbil Rotana/logo/logo.jpg</code>,{" "}
            <code>Erbil Rotana/cover/cover.jpg</code>, and{" "}
            <code>Erbil Rotana/gallery/lobby.jpg</code>. You can also use filenames such as
            <code> Erbil Rotana__gallery__1.jpg</code>.
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" /> Choose image folder or files
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onClick={(event) => event.currentTarget.setAttribute("webkitdirectory", "")}
              onChange={onMediaFiles}
            />
          </label>
          {mediaFiles.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Badge className="bg-green-500/10 text-green-700">
                  {mediaFiles.length} images ready
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Set(mediaFiles.map((file) => file.businessKey)).size} businesses detected
                </span>
              </div>
              <div className="max-h-56 overflow-auto rounded-lg border border-border">
                {mediaFiles.map((media, index) => (
                  <div
                    key={`${media.file.name}-${index}`}
                    className="flex items-center justify-between gap-3 border-b border-border p-2 text-xs last:border-0"
                  >
                    <span className="min-w-0 truncate">{media.businessKey}</span>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {media.kind}
                    </Badge>
                    <span className="max-w-[38%] truncate text-muted-foreground">
                      {media.file.name}
                    </span>
                  </div>
                ))}
              </div>
              <Button onClick={runMediaImport} disabled={mediaImporting} variant="outline">
                {mediaImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Upload {mediaFiles.length} image{mediaFiles.length === 1 ? "" : "s"}
              </Button>
              {mediaResult && (
                <p className="text-sm text-muted-foreground">
                  Media complete — {mediaResult.ok} uploaded, {mediaResult.failed} failed.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Upload &amp; review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" /> {fileName || "Choose CSV file"}
            <input type="file" accept=".csv" className="hidden" onChange={onFile} />
          </label>

          {rows.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Badge className="bg-green-500/10 text-green-700">
                  {validCount} ready to import
                </Badge>
                {rows.length - validCount > 0 && (
                  <Badge className="bg-destructive/10 text-destructive">
                    {rows.length - validCount} have errors
                  </Badge>
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
                              <AlertCircle className="h-4 w-4" /> {r.errors.join("; ")}
                            </span>
                          )}
                        </td>
                        <td className="p-2">{r.raw.name || "—"}</td>
                        <td className="p-2 capitalize">{r.raw.category || "—"}</td>
                        <td className="p-2">{r.raw.city || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button onClick={runImport} disabled={importing || validCount === 0}>
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Import {validCount} listing{validCount === 1 ? "" : "s"}
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
