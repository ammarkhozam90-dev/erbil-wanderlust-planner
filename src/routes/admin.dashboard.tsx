import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { Shield, LogOut, TrendingUp, MapPin, Users } from "lucide-react";
import { LOCATIONS } from "@/data/locations";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — ErbilGo" }] }),
  component: AdminPage,
});

const ADMIN_EMAIL = "ammar.khozam90@gmail.com";
const ADMIN_PASSWORD = "1122334455";

function AdminPage() {
  const { isAdmin, setAdmin, exchangeRate, setExchangeRate } = useStore();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState(String(exchangeRate));
  const [saved, setSaved] = useState(false);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-md place-items-center px-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim().toLowerCase() === ADMIN_EMAIL && pwd === ADMIN_PASSWORD) {
                setAdmin(true);
                setErr(null);
              } else setErr("Invalid credentials.");
            }}
            className="w-full rounded-3xl border border-border bg-card/80 p-8 shadow-luxury"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-gold text-gold-foreground">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Secure access</p>
                <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
              </div>
            </div>
            <div className="space-y-3">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm outline-none focus:border-primary" />
              <input type="password" placeholder="Password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm outline-none focus:border-primary" />
              <button className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90">
                Sign in
              </button>
              {err && <p className="text-center text-xs text-destructive">{err}</p>}
            </div>
          </form>
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
          <button onClick={() => setAdmin(false)} className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-semibold hover:border-destructive hover:text-destructive">
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
