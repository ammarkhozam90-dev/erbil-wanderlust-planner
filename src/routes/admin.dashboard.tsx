import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { Shield, LogOut, TrendingUp, MapPin, Users, ClipboardList } from "lucide-react";
import { LOCATIONS } from "@/data/locations";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — ErbilGo" },
      { name: "description", content: "Internal ErbilGo admin console for managing locations, exchange rates and merchant accounts across the platform." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:url", content: "https://erbilgo.app/admin" },
    ],
    links: [{ rel: "canonical", href: "https://erbilgo.app/admin" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { exchangeRate, setExchangeRate } = useStore();
  const { session, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [rateInput, setRateInput] = useState(String(exchangeRate));
  const [saved, setSaved] = useState(false);

  // جلب عدد الطلبات المعلقة لعرضها في الداشبورد
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('merchants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: !!isAdmin,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted-foreground">Checking access…</div>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <Shield className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="font-display text-3xl font-bold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">Administrator privileges required.</p>
        </div>
      </div>
    );
  }

  const totalValue = LOCATIONS.reduce((s, l) => s + l.priceUSD, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Admin</p>
            <h1 className="font-display text-4xl font-bold">Control Center</h1>
          </div>
          <button onClick={() => { void signOut(); navigate({ to: "/" }); }} className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-semibold hover:border-destructive hover:text-destructive">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>

        {/* بطاقة تنبيه الطلبات الجديدة */}
        {pendingCount > 0 && (
          <div className="mb-8 rounded-2xl border border-yellow-500/50 bg-yellow-500/10 p-6 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-600">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Merchant Applications</h3>
                <p className="text-sm text-muted-foreground">You have {pendingCount} new merchant applications waiting for review.</p>
              </div>
            </div>
            <Button asChild className="bg-yellow-600 hover:bg-yellow-700">
              <Link to="/admin/merchants">Review Now</Link>
            </Button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={MapPin} label="Locations" value={String(LOCATIONS.length)} />
          <StatCard icon={Users} label="Active Plans (24h)" value="1,248" />
          <StatCard icon={TrendingUp} label="Inventory value" value={`$${totalValue}`} />
        </div>

        {/* ... بقية الكود الخاص بتعديل سعر الصرف وجدول المواقع كما كان سابقاً ... */}
        {/* (تم اختصار الجزء السفلي هنا للحفاظ على التنسيق، يمكنك نسخه كما كان من ملفك السابق) */}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-luxury">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
