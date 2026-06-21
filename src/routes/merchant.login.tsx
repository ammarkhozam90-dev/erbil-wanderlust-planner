import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useState } from "react";
import { Store, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/merchant/login")({
  head: () => ({
    meta: [
      { title: "Merchant Portal Login — ErbilGo" },
      { name: "description", content: "Sign in to the ErbilGo Merchant Portal to manage your venue listing, offers and bookings from travellers planning their day in Erbil." },
      { property: "og:title", content: "Merchant Portal — ErbilGo" },
      { property: "og:description", content: "Business sign-in for Erbil venues partnered with ErbilGo." },
      { property: "og:url", content: "https://erbil-wanderlust-planner.lovable.app/merchant/login" },
    ],
    links: [{ rel: "canonical", href: "https://erbil-wanderlust-planner.lovable.app/merchant/login" }],
  }),
  component: MerchantLogin,
});

function MerchantLogin() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const nav = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pwd) return setMsg("Enter your credentials.");
    setMsg("Welcome back! Merchant dashboard is launching soon.");
    setTimeout(() => nav({ to: "/" }), 1500);
  }
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-md place-items-center px-4">
        <div className="w-full rounded-3xl border border-border bg-card/80 p-8 shadow-luxury">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-gold text-gold-foreground">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">For business owners</p>
              <h1 className="font-display text-2xl font-bold">Merchant Portal</h1>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input type="email" placeholder="business@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm outline-none focus:border-primary" />
            <input type="password" placeholder="Password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm outline-none focus:border-primary" />
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90">
              Sign in <ArrowRight className="h-4 w-4" />
            </button>
            {msg && <p className="text-center text-xs text-gold">{msg}</p>}
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">List your café, restaurant or experience on ErbilGo and reach thousands of curated daily plans.</p>
        </div>
      </div>
    </div>
  );
}
