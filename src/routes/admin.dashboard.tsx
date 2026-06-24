import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { Shield, LogOut, TrendingUp, MapPin, Users } from "lucide-react";
import { LOCATIONS } from "@/data/locations";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — ErbilGo" },
      { name: "description", content: "Internal ErbilGo admin console for managing locations, exchange rates and merchant accounts across the platform." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:url", content: "https://erbil-wanderlust-planner.lovable.app/admin/dashboard" },
    ],
    links: [{ rel: "canonical", href: "https://erbil-wanderlust-planner.lovable.app/admin/dashboard" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { exchangeRate, setExchangeRate } = useStore();
  const { session, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [rateInput, setRateInput] = useState(String(exchangeRate));
  const [saved, setSaved] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted-foreground">
          Checking access…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <Shield className="mx-auto mb-4 h-10 w-10 text-gold" />
          <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with an administrator account to continue.</p>
          <Button onClick={() => navigate({ to: "/auth" })} className="mt-6 bg-gold text-background hover:bg-gold/90">
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <Shield className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="font-display text-3xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have administrator privileges.
          </p>
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

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={MapPin} label="Locations" value={String(LOCATIONS.length)} />
          <StatCard icon={Users} label="Active Plans (24h)" value="1,248" />
          <StatCard icon={TrendingUp} label="Inventory value" value={`$${totalValue}`} />
        </div>

        <div className="mt-8 rounded-3xl border border-gold/30 bg-gradient-to-br from-card to-card/60 p-8 shadow-luxury">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-gold text-gold-foreground font-bold">$</span>
            <div>
              <h2 className="font-display text-2xl font-bold">Parallel Market Exchange Rate</h2>
              <p className="text-xs text-muted-foreground">Globally re-prices every USD/IQD calculation across the platform.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">1 USD =</span>
              <input
                type="number"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="mt-1 block w-48 rounded-xl border border-border bg-secondary/60 px-4 py-3 text-lg font-bold outline-none focus:border-gold"
              />
            </label>
            <span className="pb-3 text-sm text-muted-foreground">IQD</span>
            <button
              onClick={() => {
                const n = Number(rateInput);
                if (n > 0) {
                  setExchangeRate(n);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 1800);
                }
              }}
              className="ml-auto rounded-xl bg-gradient-gold px-5 py-3 text-sm font-semibold text-gold-foreground hover:opacity-90"
            >
              Update Rate
            </button>
          </div>
          {saved && <p className="mt-3 text-xs text-primary">✓ Rate updated globally.</p>}
          <p className="mt-4 text-xs text-muted-foreground">Current effective rate: <span className="font-bold text-gold">1 USD = {exchangeRate.toLocaleString()} IQD</span></p>
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
          <h2 className="mb-4 font-display text-xl font-bold">Location Inventory</h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2">Name</th><th>Category</th><th>Area</th><th className="text-right">USD</th><th className="text-right">IQD</th></tr>
              </thead>
              <tbody>
                {LOCATIONS.map((l) => (
                  <tr key={l.id} className="border-t border-border/50">
                    <td className="py-2 font-medium">{l.name}</td>
                    <td className="text-muted-foreground">{l.category}</td>
                    <td className="text-muted-foreground">{l.area}</td>
                    <td className="text-right">${l.priceUSD}</td>
                    <td className="text-right text-gold">{(l.priceUSD * exchangeRate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
