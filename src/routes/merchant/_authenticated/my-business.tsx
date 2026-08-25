import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMyMerchant } from "@/components/merchant/use-my-merchant";
import { useMerchantContext } from "@/components/merchant/merchant-context";
import { MapPicker } from "@/components/merchant/MapPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressImage } from "@/lib/compress-image";
import { ImageCropDialog } from "@/components/merchant/ImageCropDialog";
import {
  Plus,
  Upload,
  Trash2,
  AlertCircle,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Sparkles,
  X,
  ShieldCheck,
  FileText,
  Loader2,
} from "lucide-react";
import type {
  BusinessCategory,
  PriceLevel,
  MerchantHour,
  MerchantPhoto,
} from "@/integrations/supabase/types-local";

export const Route = createFileRoute("/merchant/_authenticated/my-business")({
  component: MyBusiness,
});

const CATEGORIES: BusinessCategory[] = [
  "restaurant",
  "cafe",
  "hotel",
  "attraction",
  "shop",
  "activity",
  "other",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MOODS = [
  "Adventure",
  "Nature",
  "History & Culture",
  "Luxury",
  "Family",
  "Photography",
  "Relaxing",
  "Nightlife",
  "Food",
  "Budget",
  "Social",
  "Cozy",
];
const TIMES = ["morning", "afternoon", "evening", "night"];
const SUITS = ["Solo", "Couple", "Family", "Friends", "Business Travelers"];
const TRANSPORT = ["walking", "car", "taxi", "public"];
const PRICES: PriceLevel[] = ["$", "$$", "$$$", "$$$$"];
const FEATURE_OPTIONS = [
  "WiFi",
  "Parking",
  "Outdoor Seating",
  "Family Friendly",
  "Pet Friendly",
  "Wheelchair Accessible",
  "Delivery",
  "Takeaway",
  "Reservations",
  "Live Music",
  "Smoking Area",
  "Card Payment",
  "Kids Play Area",
  "Air Conditioning",
  "Power Outlets",
  "Private Rooms",
];
const DIETARY_OPTIONS = [
  "Halal",
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Gluten-free",
  "Dairy-free",
  "No restrictions",
];
const ROOM_AMENITY_OPTIONS = [
  "Private bathroom",
  "Air conditioning",
  "Heating",
  "Balcony",
  "City view",
  "Garden view",
  "Minibar",
  "Safe",
  "TV",
  "Workspace",
  "Bathtub",
];
const HOTEL_AMENITY_OPTIONS = [
  "Breakfast included",
  "Restaurant on site",
  "Room service",
  "Free WiFi",
  "Swimming pool",
  "Gym",
  "Spa",
  "24-hour reception",
  "Family rooms",
  "Accessible rooms",
  "Meeting rooms",
  "Laundry service",
];

const BASE_STEPS = [
  { id: "basic", label: "Identity", description: "The core details of your business" },
  { id: "location", label: "Location", description: "Where can travelers find you?" },
  { id: "social", label: "Connect", description: "Social media and contact info" },
  { id: "photos", label: "Visuals", description: "Showcase your space with photos" },
  { id: "hours", label: "Schedule", description: "When are you open for guests?" },
  { id: "features", label: "Services", description: "Amenities and special offerings" },
  { id: "ai", label: "AI Intel", description: "Help our AI recommend you correctly" },
  { id: "verification", label: "Trust", description: "Optionally help us verify your ownership" },
  { id: "review", label: "Finish", description: "Review and submit your listing" },
] as const;

const HOTEL_STEP = {
  id: "hotel",
  label: "Hotel Details",
  description: "Tell travelers what to expect from their stay",
} as const;

type RoomType = {
  id: string;
  name: string;
  description: string;
  bed_type: string;
  room_size_sqm: number | null;
  max_guests: number;
  available_units: number | null;
  price_from: number | null;
  currency: string;
  amenities: string[];
  accessible: boolean;
};

type HotelProfile = {
  merchant_id: string;
  star_rating: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  amenities: string[];
  breakfast_available: boolean;
  airport_transfer_available: boolean;
  parking_available: boolean;
  cancellation_policy: string;
  affiliate_booking_url: string;
  whatsapp_booking_enabled: boolean;
  room_types: RoomType[];
};

const EMPTY_HOTEL_PROFILE: HotelProfile = {
  merchant_id: "",
  star_rating: null,
  check_in_time: null,
  check_out_time: null,
  amenities: [],
  breakfast_available: false,
  airport_transfer_available: false,
  parking_available: false,
  cancellation_policy: "",
  affiliate_booking_url: "",
  whatsapp_booking_enabled: false,
  room_types: [],
};

function createRoomType(): RoomType {
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    description: "",
    bed_type: "",
    room_size_sqm: null,
    max_guests: 2,
    available_units: null,
    price_from: null,
    currency: "USD",
    amenities: [],
    accessible: false,
  };
}

function normalizeRoomTypes(value: unknown): RoomType[] {
  if (!Array.isArray(value)) return [];
  return value.map((room, index) => {
    const item = room && typeof room === "object" ? (room as Partial<RoomType>) : {};
    return {
      ...createRoomType(),
      ...item,
      id: typeof item.id === "string" && item.id ? item.id : `room-${index}`,
      name: typeof item.name === "string" ? item.name : "",
      description: typeof item.description === "string" ? item.description : "",
      bed_type: typeof item.bed_type === "string" ? item.bed_type : "",
      amenities: Array.isArray(item.amenities)
        ? item.amenities.filter((amenity): amenity is string => typeof amenity === "string")
        : [],
      currency: typeof item.currency === "string" && item.currency ? item.currency : "USD",
      max_guests:
        Number.isFinite(item.max_guests) && Number(item.max_guests) > 0
          ? Number(item.max_guests)
          : 2,
      room_size_sqm: item.room_size_sqm == null ? null : Number(item.room_size_sqm),
      available_units: item.available_units == null ? null : Number(item.available_units),
      price_from: item.price_from == null ? null : Number(item.price_from),
      accessible: Boolean(item.accessible),
    };
  });
}

function emptyHours(): MerchantHour[] {
  return DAYS.map((_, i) => ({
    id: `tmp-${i}`,
    merchant_id: "",
    day_of_week: i,
    is_closed: false,
    is_24h: false,
    open_time: "09:00",
    close_time: "22:00",
  }));
}

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive animate-in fade-in slide-in-from-top-1">
      <AlertCircle className="h-3 w-3 shrink-0" /> {message}
    </p>
  );
}

function MultiPick({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  function toggle(o: string) {
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  }
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className="transition-transform active:scale-95"
            >
              <Badge
                variant={active ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-3 py-1 text-xs capitalize transition-all",
                  active
                    ? "bg-gold text-background hover:bg-gold/90 border-transparent"
                    : "hover:border-gold/50",
                )}
              >
                {o}
              </Badge>
            </button>
          );
        })}
      </div>
      {error && <FieldError show message={error} />}
    </div>
  );
}

function MyBusiness() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: m, isLoading } = useMyMerchant(user?.id);

  const [form, setForm] = useState<any>(null);
  const [hotelProfile, setHotelProfile] = useState<HotelProfile>(EMPTY_HOTEL_PROFILE);
  const [activeStep, setActiveStep] = useState(0);
  const isHotel = (form?.categories ?? (form?.category ? [form.category] : [])).some(
    (category: string) => category.toLowerCase() === "hotel",
  );
  const steps = useMemo(() => {
    if (!isHotel) return [...BASE_STEPS];
    const aiIndex = BASE_STEPS.findIndex((step) => step.id === "ai");
    return [...BASE_STEPS.slice(0, aiIndex), HOTEL_STEP, ...BASE_STEPS.slice(aiIndex)];
  }, [isHotel]);
  const activeStepId = steps[activeStep]?.id;
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [hourRows, setHourRows] = useState<MerchantHour[]>(emptyHours());
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Set<string>>(new Set());
  const [cropTarget, setCropTarget] = useState<{ kind: "logo" | "cover"; src: string } | null>(
    null,
  );
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [uploadingVerification, setUploadingVerification] = useState(false);

  const hotelProfileQ = useQuery({
    queryKey: ["hotel-profile", m?.id],
    enabled: Boolean(m?.id && isHotel),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_profiles" as any)
        .select("*")
        .eq("merchant_id", m!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as HotelProfile | null) ?? null;
    },
  });

  const hoursQ = useQuery({
    queryKey: ["merchant-hours", m?.id],
    enabled: !!m?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_hours")
        .select("*")
        .eq("merchant_id", m!.id)
        .order("day_of_week");
      if (error) throw error;
      return (data ?? []) as MerchantHour[];
    },
  });

  useEffect(() => {
    if (!hoursQ.data) return;
    const map = new Map(hoursQ.data.map((h) => [h.day_of_week, h]));
    setHourRows(emptyHours().map((d) => map.get(d.day_of_week) ?? d));
  }, [hoursQ.data]);

  useEffect(() => {
    const profile = hotelProfileQ.data;
    if (!profile) return;

    setHotelProfile({
      ...EMPTY_HOTEL_PROFILE,
      ...profile,
      amenities: profile.amenities ?? [],
      cancellation_policy: profile.cancellation_policy ?? "",
      affiliate_booking_url: profile.affiliate_booking_url ?? "",
      room_types: normalizeRoomTypes(profile.room_types),
    });
  }, [hotelProfileQ.data]);

  useEffect(() => {
    if (activeStep >= steps.length) setActiveStep(steps.length - 1);
  }, [activeStep, steps.length]);

  const photosQ = useQuery({
    queryKey: ["merchant-photos", m?.id],
    enabled: !!m?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_photos")
        .select("*")
        .eq("merchant_id", m!.id)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as MerchantPhoto[];
    },
  });

  useEffect(() => {
    if (m && !form) {
      const nextForm = {
        ...m,
        categories: (m as any).categories?.length ? (m as any).categories : [m.category],
      } as any;
      if (nextForm.name === "My New Business" || nextForm.name === "Untitled business")
        nextForm.name = "";
      setForm(nextForm);
    }
  }, [m, form]);

  useEffect(() => {
    if (!isLoading && !m) navigate({ to: "/merchant/dashboard", replace: true });
  }, [isLoading, m, navigate]);

  if (isLoading || !m || !form)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Sparkles className="mr-2 h-5 w-5 animate-pulse text-gold" /> Loading your workspace…
      </div>
    );

  function update<K extends string>(key: K, value: unknown) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function updateHotel<K extends keyof HotelProfile>(key: K, value: HotelProfile[K]) {
    setHotelProfile((current) => ({ ...current, [key]: value }));
  }

  function updateRoom<K extends keyof RoomType>(
    roomId: string,
    key: K,
    value: RoomType[K],
  ) {
    setHotelProfile((current) => ({
      ...current,
      room_types: current.room_types.map((room) =>
        room.id === roomId ? { ...room, [key]: value } : room,
      ),
    }));
  }

  function addRoom() {
    setHotelProfile((current) => ({
      ...current,
      room_types: [...current.room_types, createRoomType()],
    }));
  }

  function removeRoom(roomId: string) {
    setHotelProfile((current) => ({
      ...current,
      room_types: current.room_types.filter((room) => room.id !== roomId),
    }));
  }

  function toggleCategory(c: BusinessCategory) {
    setForm((f: any) => {
      const current: BusinessCategory[] = f.categories ?? [];
      if (current.includes(c)) {
        if (current.length === 1) return f;
        return { ...f, categories: current.filter((x) => x !== c) };
      }
      return { ...f, categories: [...current, c] };
    });
  }

  function updateHour(i: number, patch: Partial<MerchantHour>) {
    setHourRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function saveAll(silent = false) {
    if (!silent) setSaving(true);
    const hoursPayload = hourRows.map((r) => ({
      merchant_id: form.id,
      day_of_week: r.day_of_week,
      is_closed: r.is_closed,
      is_24h: r.is_24h,
      open_time: r.is_24h || r.is_closed ? null : r.open_time,
      close_time: r.is_24h || r.is_closed ? null : r.close_time,
    }));

    const [merchantRes, hoursRes] = await Promise.all([
      supabase
        .from("merchants")
        .update({
          name: form.name,
          categories: form.categories,
          description: form.description,
          phone: form.phone,
          email: form.email,
          website: form.website,
          address: form.address,
          city: form.city,
          latitude: form.latitude,
          longitude: form.longitude,
          instagram: form.instagram,
          facebook: form.facebook,
          tiktok: form.tiktok,
          whatsapp: form.whatsapp,
          features: form.features,
          dietary_options: form.dietary_options,
          mood_tags: form.mood_tags,
          best_visit_time: form.best_visit_time,
          avg_duration_minutes: Number(form.avg_duration_minutes) || 60,
          price_level: form.price_level,
          suitability: form.suitability,
          transportation: form.transportation,
        } as any)
        .eq("id", form.id),
      supabase
        .from("merchant_hours")
        .upsert(hoursPayload, { onConflict: "merchant_id,day_of_week" }),
    ]);

    if (!silent) setSaving(false);
    if (merchantRes.error) return toast.error(merchantRes.error.message);
    if (hoursRes.error) return toast.error(hoursRes.error.message);

    if (isHotel) {
      const { error: hotelError } = await supabase.from("hotel_profiles" as any).upsert(
        {
          ...hotelProfile,
          room_types: hotelProfile.room_types.map(({ id: _id, ...room }) => room),
          merchant_id: form.id,
        },
        { onConflict: "merchant_id" },
      );
      if (hotelError) return toast.error(hotelError.message);
    }

    if (!silent) toast.success("Progress saved");
    qc.invalidateQueries({ queryKey: ["my-merchants", user?.id] });
    qc.invalidateQueries({ queryKey: ["merchant-hours", form.id] });
    qc.invalidateQueries({ queryKey: ["hotel-profile", form.id] });
  }

  async function uploadPhoto(kind: "logo" | "cover" | "gallery", file: File) {
    const previousUrl = kind === "logo" ? m!.logo_url : kind === "cover" ? m!.cover_url : null;
    let toUpload: Blob;
    try {
      toUpload = await compressImage(file, { maxSizeKB: 250, maxDimension: 1920 });
    } catch {
      toUpload = file;
    }
    const path = `${user!.id}/${m!.id}/${kind}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("merchant-media")
      .upload(path, toUpload, { contentType: "image/jpeg", upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data } = supabase.storage.from("merchant-media").getPublicUrl(path);
    const url = data.publicUrl;
    if (kind === "gallery") {
      await supabase
        .from("merchant_photos")
        .insert({ merchant_id: m!.id, url, sort_order: photosQ.data?.length ?? 0 });
      qc.invalidateQueries({ queryKey: ["merchant-photos", m!.id] });
    } else {
      await supabase
        .from("merchants")
        .update({ [`${kind}_url`]: url })
        .eq("id", m!.id);
      qc.invalidateQueries({ queryKey: ["my-merchants", user!.id] });
      const marker = "/storage/v1/object/public/merchant-media/";
      if (previousUrl?.includes(marker)) {
        const oldPath = decodeURIComponent(
          previousUrl.slice(previousUrl.indexOf(marker) + marker.length),
        );
        await supabase.storage.from("merchant-media").remove([oldPath]);
      }
    }
    toast.success("Uploaded");
  }

  async function uploadVerificationProof(file: File) {
    setUploadingVerification(true);
    try {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
      const path = `${user!.id}/${m!.id}/ownership-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("verification-docs")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase
        .from("merchants")
        .update({ verification_document_url: path, verification_status: "pending" } as any)
        .eq("id", m!.id);
      if (updateError) throw updateError;
      update("verification_document_url", path);
      qc.invalidateQueries({ queryKey: ["my-merchants", user?.id] });
      setVerificationFile(null);
      toast.success("Ownership proof saved securely.");
      return true;
    } catch (error: any) {
      toast.error(error?.message ?? "Could not upload the proof.");
      return false;
    } finally {
      setUploadingVerification(false);
    }
  }

  const checks = [
    { id: "name", label: "Name", ok: !!form.name?.trim(), step: 0 },
    { id: "cat", label: "Category", ok: !!form.categories?.length, step: 0 },
    { id: "loc", label: "Location", ok: form.latitude != null && form.longitude != null, step: 1 },
    { id: "phone", label: "Phone", ok: !!form.phone?.trim(), step: 0 },
    { id: "logo", label: "Logo", ok: !!m?.logo_url, step: 3 },
    { id: "cover", label: "Cover", ok: !!m?.cover_url, step: 3 },
  ];

  async function goNext() {
    if (
      activeStepId === "basic" &&
      (!form.name?.trim() || !form.phone?.trim() || !form.categories?.length)
    ) {
      setAttemptedSubmit(true);
      return toast.error("Please complete the basic identity before continuing.");
    }
    if (activeStepId === "location" && (form.latitude == null || form.longitude == null)) {
      setAttemptedSubmit(true);
      return toast.error("Pin your location on the map first.");
    }
    if (activeStepId === "verification" && verificationFile) {
      const uploaded = await uploadVerificationProof(verificationFile);
      if (!uploaded) return;
    }
    await saveAll(true);
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setActiveStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmitForReview() {
    const missing = checks.filter((c) => !c.ok);
    if (missing.length > 0) {
      setAttemptedSubmit(true);
      toast.error(`Please complete: ${missing.map((m) => m.label).join(", ")}`);
      setActiveStep(missing[0].step);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("merchants")
      .update({ status: "pending" })
      .eq("id", form.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Listing submitted for review!");
    qc.invalidateQueries({ queryKey: ["my-merchants", user?.id] });
    navigate({ to: "/merchant/dashboard" });
  }

  function pickForCrop(kind: "logo" | "cover", file: File) {
    const src = URL.createObjectURL(file);
    setCropTarget({ kind, src });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#090b0b] p-2 md:p-5 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.06),transparent_30%)]" />
      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-[1.75rem] border border-gold/20 bg-background/95 shadow-2xl shadow-black/50 backdrop-blur-xl md:rounded-[2.25rem]">
        {/* Immersive Header */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-gold/10 bg-card/40 px-6 backdrop-blur-xl md:px-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate({ to: "/merchant/dashboard" })}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/50 transition-colors hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
                  Setup Wizard
                </span>
                <div className="h-1 w-1 rounded-full bg-gold/30" />
                <span className="text-[10px] font-medium text-muted-foreground">
                  Step {activeStep + 1} of {steps.length}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold tracking-tight">
                {steps[activeStep].label}
              </h2>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => i <= activeStep && setActiveStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === activeStep
                    ? "w-8 bg-gold"
                    : i < activeStep
                      ? "w-4 bg-gold/40"
                      : "w-4 bg-border hover:bg-gold/20",
                )}
                title={s.label}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => saveAll()}
            disabled={saving}
            className="text-xs font-semibold uppercase tracking-wider text-gold hover:bg-gold/10"
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                <Save className="mr-2 h-3.5 w-3.5" /> Save Draft
              </>
            )}
          </Button>
        </header>

        {/* Main Content Area */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 text-center md:text-left">
              <h1 className="font-display text-3xl font-bold md:text-4xl">
                {steps[activeStep].label}
              </h1>
              <p className="mt-2 text-muted-foreground">{steps[activeStep].description}</p>
            </div>

            <div className="space-y-8 pb-32">
              {activeStepId === "basic" && (
                <div className="grid gap-8">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Business Name
                      </Label>
                      <Input
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="e.g. Citadel View Restaurant"
                        className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                      />
                      <FieldError
                        show={attemptedSubmit && !form.name?.trim()}
                        message="Name is required"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Primary Phone
                      </Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="+964 …"
                        className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                      />
                      <FieldError
                        show={attemptedSubmit && !form.phone?.trim()}
                        message="Phone is required"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Category
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => {
                        const active = (form.categories ?? []).includes(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => toggleCategory(c)}
                            className="transition-transform active:scale-95"
                          >
                            <Badge
                              variant={active ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer px-4 py-2 text-xs capitalize transition-all",
                                active
                                  ? "bg-gold text-background border-transparent"
                                  : "hover:border-gold/50",
                              )}
                            >
                              {c}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                    <FieldError
                      show={attemptedSubmit && !form.categories?.length}
                      message="Select at least one category"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Description
                    </Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="Tell travelers what makes your place special…"
                      rows={5}
                      className="border-gold/10 bg-card focus-visible:ring-gold"
                    />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Public Email
                      </Label>
                      <Input
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="hello@business.com"
                        className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Website
                      </Label>
                      <Input
                        value={form.website}
                        onChange={(e) => update("website", e.target.value)}
                        placeholder="https://…"
                        className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeStepId === "location" && (
                <div className="grid gap-8">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Street Address
                      </Label>
                      <Input
                        value={form.address}
                        onChange={(e) => update("address", e.target.value)}
                        placeholder="e.g. 100m Road, near Citadel"
                        className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        City / District
                      </Label>
                      <Input
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        placeholder="e.g. Ankawa, Erbil"
                        className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                      />
                    </div>
                  </div>
                  <div className="relative h-[450px] w-full overflow-hidden rounded-3xl border border-gold/20 shadow-xl">
                    <MapPicker
                      lat={form.latitude}
                      lng={form.longitude}
                      onChange={(lat, lng) => {
                        update("latitude", lat);
                        update("longitude", lng);
                      }}
                    />
                  </div>
                  <FieldError
                    show={attemptedSubmit && (form.latitude == null || form.longitude == null)}
                    message="Please pin your location on the map"
                  />
                </div>
              )}

              {activeStepId === "social" && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Instagram
                    </Label>
                    <Input
                      value={form.instagram}
                      onChange={(e) => update("instagram", e.target.value)}
                      placeholder="@username"
                      className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Facebook
                    </Label>
                    <Input
                      value={form.facebook}
                      onChange={(e) => update("facebook", e.target.value)}
                      placeholder="URL"
                      className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Tiktok
                    </Label>
                    <Input
                      value={form.tiktok}
                      onChange={(e) => update("tiktok", e.target.value)}
                      placeholder="@username"
                      className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Whatsapp
                    </Label>
                    <Input
                      value={form.whatsapp}
                      onChange={(e) => update("whatsapp", e.target.value)}
                      placeholder="+964 …"
                      className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                    />
                  </div>
                </div>
              )}

              {activeStepId === "photos" && (
                <div className="space-y-10">
                  <div className="grid gap-10 md:grid-cols-2">
                    <div className="space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Logo
                      </Label>
                      <div className="group relative aspect-square w-40 overflow-hidden rounded-3xl border-2 border-dashed border-gold/20 bg-card transition-all hover:border-gold/50">
                        {m?.logo_url ? (
                          <img src={m.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageOff className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                        <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
                          <Upload className="mr-2 h-5 w-5 text-gold" />
                          <span className="text-xs font-bold text-gold">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              e.target.files?.[0] && pickForCrop("logo", e.target.files[0])
                            }
                          />
                        </label>
                      </div>
                      <FieldError
                        show={attemptedSubmit && !m?.logo_url}
                        message="A logo helps travelers recognize you"
                      />
                    </div>
                    <div className="space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Cover Image
                      </Label>
                      <div className="group relative aspect-video w-full overflow-hidden rounded-3xl border-2 border-dashed border-gold/20 bg-card transition-all hover:border-gold/50">
                        {m?.cover_url ? (
                          <img src={m.cover_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageOff className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                        <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
                          <Upload className="mr-2 h-5 w-5 text-gold" />
                          <span className="text-xs font-bold text-gold">Upload Cover</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              e.target.files?.[0] && pickForCrop("cover", e.target.files[0])
                            }
                          />
                        </label>
                      </div>
                      <FieldError
                        show={attemptedSubmit && !m?.cover_url}
                        message="High quality cover images increase clicks"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Gallery
                    </Label>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {photosQ.data?.map((p) => (
                        <div
                          key={p.id}
                          className="group relative aspect-square overflow-hidden rounded-2xl border border-gold/10 bg-card"
                        >
                          <img
                            src={p.url}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={() => setBrokenPhotoIds((s) => new Set(s).add(p.id))}
                          />
                          <button
                            onClick={async () => {
                              await supabase.from("merchant_photos").delete().eq("id", p.id);
                              qc.invalidateQueries({ queryKey: ["merchant-photos", m!.id] });
                            }}
                            className="absolute right-2 top-2 rounded-lg bg-destructive/90 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold/10 bg-card/50 transition-all hover:border-gold/40 hover:bg-gold/5">
                        <Plus className="h-6 w-6 text-gold" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
                          Add Photo
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            e.target.files?.[0] && uploadPhoto("gallery", e.target.files[0])
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeStepId === "hours" && (
                <div className="space-y-4 rounded-3xl border border-gold/10 bg-card/30 p-6">
                  {hourRows.map((h, i) => (
                    <div
                      key={h.day_of_week}
                      className="flex flex-wrap items-center gap-4 border-b border-border/40 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="w-24 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {DAYS[h.day_of_week]}
                      </div>
                      <div className="flex flex-1 items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            className="w-32 border-gold/10 bg-background"
                            disabled={h.is_closed || h.is_24h}
                            value={h.open_time || "09:00"}
                            onChange={(e) => updateHour(i, { open_time: e.target.value })}
                          />
                          <span className="text-xs font-medium text-muted-foreground">to</span>
                          <Input
                            type="time"
                            className="w-32 border-gold/10 bg-background"
                            disabled={h.is_closed || h.is_24h}
                            value={h.close_time || "22:00"}
                            onChange={(e) => updateHour(i, { close_time: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            <Switch
                              checked={h.is_24h}
                              onCheckedChange={(v) =>
                                updateHour(i, { is_24h: v, is_closed: false })
                              }
                              className="data-[state=checked]:bg-gold"
                            />{" "}
                            24h
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            <Switch
                              checked={h.is_closed}
                              onCheckedChange={(v) =>
                                updateHour(i, { is_closed: v, is_24h: false })
                              }
                              className="data-[state=checked]:bg-destructive"
                            />{" "}
                            Closed
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeStepId === "features" && (
                <div className="grid gap-10">
                  <MultiPick
                    label="Amenities & Features"
                    options={FEATURE_OPTIONS}
                    value={form.features || []}
                    onChange={(v) => update("features", v)}
                  />
                  <MultiPick
                    label="Dietary Options"
                    options={DIETARY_OPTIONS}
                    value={form.dietary_options || []}
                    onChange={(v) => update("dietary_options", v)}
                  />
                </div>
              )}

              {activeStepId === "hotel" && (
                <div className="space-y-8">
                  <div className="rounded-3xl border border-gold/15 bg-gold/5 p-5">
                    <p className="text-sm font-semibold text-gold">Hotel profile</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These details help travelers understand the stay before they send a booking
                      request. You can leave optional fields blank while the listing is a draft.
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Star classification
                      </Label>
                      <Select
                        value={hotelProfile.star_rating ? String(hotelProfile.star_rating) : ""}
                        onValueChange={(value) => updateHotel("star_rating", Number(value))}
                      >
                        <SelectTrigger className="h-12 border-gold/10 bg-card">
                          <SelectValue placeholder="Not specified" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <SelectItem key={rating} value={String(rating)}>
                              {rating} star{rating === 1 ? "" : "s"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Use the official classification where available.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Check-in time
                      </Label>
                      <Input
                        type="time"
                        value={hotelProfile.check_in_time ?? ""}
                        onChange={(event) =>
                          updateHotel("check_in_time", event.target.value || null)
                        }
                        className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Check-out time
                      </Label>
                      <Input
                        type="time"
                        value={hotelProfile.check_out_time ?? ""}
                        onChange={(event) =>
                          updateHotel("check_out_time", event.target.value || null)
                        }
                        className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                      />
                    </div>
                  </div>

                  <MultiPick
                    label="Hotel amenities"
                    options={HOTEL_AMENITY_OPTIONS}
                    value={hotelProfile.amenities}
                    onChange={(value) => updateHotel("amenities", value)}
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-gold/10 bg-card/40 p-4">
                      <span>
                        <span className="block text-sm font-semibold">Breakfast available</span>
                        <span className="text-xs text-muted-foreground">
                          Mention it on the hotel page.
                        </span>
                      </span>
                      <Switch
                        checked={hotelProfile.breakfast_available}
                        onCheckedChange={(value) => updateHotel("breakfast_available", value)}
                        className="data-[state=checked]:bg-gold"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-gold/10 bg-card/40 p-4">
                      <span>
                        <span className="block text-sm font-semibold">Airport transfer</span>
                        <span className="text-xs text-muted-foreground">
                          Offer pickup or drop-off.
                        </span>
                      </span>
                      <Switch
                        checked={hotelProfile.airport_transfer_available}
                        onCheckedChange={(value) =>
                          updateHotel("airport_transfer_available", value)
                        }
                        className="data-[state=checked]:bg-gold"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-gold/10 bg-card/40 p-4">
                      <span>
                        <span className="block text-sm font-semibold">Parking available</span>
                        <span className="text-xs text-muted-foreground">
                          Useful for road travellers.
                        </span>
                      </span>
                      <Switch
                        checked={hotelProfile.parking_available}
                        onCheckedChange={(value) => updateHotel("parking_available", value)}
                        className="data-[state=checked]:bg-gold"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Cancellation policy
                    </Label>
                    <Textarea
                      value={hotelProfile.cancellation_policy}
                      onChange={(event) => updateHotel("cancellation_policy", event.target.value)}
                      placeholder="e.g. Free cancellation up to 24 hours before check-in."
                      rows={4}
                      className="border-gold/10 bg-card focus-visible:ring-gold"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Affiliate booking URL (optional)
                      </Label>
                      <Input
                        type="url"
                        value={hotelProfile.affiliate_booking_url}
                        onChange={(event) =>
                          updateHotel("affiliate_booking_url", event.target.value)
                        }
                        placeholder="https://partner.example/hotel"
                        className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                      />
                      <p className="text-xs text-muted-foreground">
                        ErbilGo will show this only as an external booking option.
                      </p>
                    </div>
                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-gold/10 bg-card/40 p-4">
                      <span>
                        <span className="block text-sm font-semibold">
                          Accept WhatsApp requests
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Let travelers continue the request with your hotel.
                        </span>
                      </span>
                      <Switch
                        checked={hotelProfile.whatsapp_booking_enabled}
                        onCheckedChange={(value) => updateHotel("whatsapp_booking_enabled", value)}
                        className="data-[state=checked]:bg-gold"
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeStepId === "ai" && (
                <div className="grid gap-10">
                  <MultiPick
                    label="Best Moods/Vibes"
                    options={MOODS}
                    value={form.mood_tags || []}
                    onChange={(v) => update("mood_tags", v)}
                  />
                  <div className="grid gap-8 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Best time to visit
                      </Label>
                      <Select
                        value={form.best_visit_time}
                        onValueChange={(v) => update("best_visit_time", v)}
                      >
                        <SelectTrigger className="h-12 border-gold/10 bg-card">
                          <SelectValue placeholder="Select time…" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMES.map((t) => (
                            <SelectItem key={t} value={t} className="capitalize">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Price Level
                      </Label>
                      <Select
                        value={form.price_level}
                        onValueChange={(v) => update("price_level", v)}
                      >
                        <SelectTrigger className="h-12 border-gold/10 bg-card">
                          <SelectValue placeholder="Select level…" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRICES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <MultiPick
                    label="Suitable for"
                    options={SUITS}
                    value={form.suitability || []}
                    onChange={(v) => update("suitability", v)}
                  />
                  <MultiPick
                    label="Best transportation"
                    options={TRANSPORT}
                    value={form.transportation || []}
                    onChange={(v) => update("transportation", v)}
                  />
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Average visit duration (minutes)
                    </Label>
                    <Input
                      type="number"
                      value={form.avg_duration_minutes}
                      onChange={(e) => update("avg_duration_minutes", e.target.value)}
                      placeholder="e.g. 60"
                      className="h-12 border-gold/10 bg-card focus-visible:ring-gold"
                    />
                  </div>
                </div>
              )}

              {activeStepId === "verification" && (
                <div className="space-y-8">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold/10 text-gold">
                    <ShieldCheck className="h-9 w-9" />
                  </div>
                  <div className="text-center">
                    <h2 className="font-display text-3xl font-bold">Build trust, at your pace</h2>
                    <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                      A simple ownership document helps our team verify your listing. This step is
                      optional now — you can skip it and submit, or provide it later if our team
                      requests it.
                    </p>
                  </div>
                  <div className="mx-auto max-w-xl rounded-3xl border border-gold/15 bg-card/50 p-6">
                    {m.verification_document_url ? (
                      <div className="flex items-center gap-3 text-left">
                        <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        <div>
                          <p className="font-semibold">Proof already uploaded</p>
                          <p className="text-xs text-muted-foreground">
                            It is stored privately and visible only to you and ErbilGo admins.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gold/20 px-6 py-10 transition-colors hover:border-gold/50 hover:bg-gold/5">
                        <FileText className="h-8 w-8 text-gold" />
                        <span className="font-semibold">
                          {verificationFile
                            ? verificationFile.name
                            : "Upload a business licence, utility bill, or official document"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Image or PDF · optional · securely stored
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(event) => setVerificationFile(event.target.files?.[0] ?? null)}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    You can continue without uploading anything.
                  </p>
                </div>
              )}

              {activeStepId === "review" && (
                <div className="space-y-8 text-center">
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gold/10 text-gold shadow-luxury">
                    <Sparkles className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="font-display text-3xl font-bold">You're almost there!</h2>
                    <p className="mt-3 text-muted-foreground">
                      Your listing is ready to be reviewed by the ErbilGo team.
                    </p>
                  </div>
                  <div className="mx-auto max-w-md rounded-2xl border border-gold/10 bg-card/40 p-6 text-left">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-gold">
                      Final Checklist
                    </h3>
                    <div className="space-y-3">
                      {checks.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">{c.label}</span>
                          {c.ok ? (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-500/10 text-emerald-500"
                            >
                              Ready
                            </Badge>
                          ) : (
                            <button
                              onClick={() => setActiveStep(c.step)}
                              className="text-[10px] font-bold uppercase text-gold hover:underline"
                            >
                              Missing
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleSubmitForReview}
                    disabled={submitting || m.status === "pending"}
                    className="h-14 w-full max-w-md bg-gold text-lg font-bold text-background shadow-luxury hover:bg-gold/90"
                  >
                    {submitting ? (
                      "Submitting…"
                    ) : m.status === "pending" ? (
                      "Already Pending"
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" /> Submit for Review
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Floating Immersive Footer Navigation */}
        <footer className="z-20 flex shrink-0 items-center justify-between gap-3 border-t border-gold/15 bg-card/75 px-3 py-3 backdrop-blur-2xl md:gap-6 md:px-6 md:py-4">
          <button
            onClick={goBack}
            disabled={activeStepId === "basic"}
            className={cn(
              "flex h-12 items-center gap-2 rounded-full px-6 text-sm font-bold transition-all active:scale-95",
              activeStepId === "basic"
                ? "opacity-20 cursor-not-allowed"
                : "hover:bg-gold/10 text-gold",
            )}
          >
            <ChevronLeft className="h-5 w-5" /> Back
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/60">
              {steps[activeStep].id}
            </span>
            <div className="mt-1 flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 w-1 rounded-full transition-all",
                    i === activeStep ? "w-4 bg-gold" : i < activeStep ? "bg-gold/40" : "bg-border",
                  )}
                />
              ))}
            </div>
          </div>

          {activeStep < steps.length - 1 ? (
            <button
              onClick={goNext}
              className="flex h-12 items-center gap-2 rounded-full bg-gold px-8 text-sm font-bold text-background shadow-lg transition-all hover:bg-gold/90 active:scale-95"
            >
              Next <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <div className="w-[100px]" />
          )}
        </footer>
      </div>

      <ImageCropDialog
        open={!!cropTarget}
        imageSrc={cropTarget?.src ?? null}
        aspect={cropTarget?.kind === "logo" ? 1 : 16 / 9}
        title={cropTarget?.kind === "logo" ? "Adjust your logo" : "Adjust your cover image"}
        onCancel={() => {
          if (cropTarget) URL.revokeObjectURL(cropTarget.src);
          setCropTarget(null);
        }}
        onConfirm={async (blob) => {
          if (!cropTarget) return;
          const { kind, src } = cropTarget;
          URL.revokeObjectURL(src);
          setCropTarget(null);
          const croppedFile = new File([blob], `${kind}.jpg`, { type: "image/jpeg" });
          await uploadPhoto(kind, croppedFile);
        }}
      />
    </div>
  );
}
