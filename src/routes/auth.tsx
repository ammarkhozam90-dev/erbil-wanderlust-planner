import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — ErbilGo" },
      {
        name: "description",
        content:
          "Sign in or create your ErbilGo account to sync saved spots, preferences, and itineraries across all your devices.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Sign In — ErbilGo" },
      { property: "og:url", content: "https://erbil-wanderlust-planner.lovable.app/auth" },
    ],
    links: [
      { rel: "canonical", href: "https://erbil-wanderlust-planner.lovable.app/auth" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/profile" });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, fullName.trim() || email.split("@")[0]);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(mode === "signin" ? "Welcome back" : "Account created");
    navigate({ to: "/profile" });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
          {mode === "signin" ? "Welcome back" : "Join ErbilGo"}
        </p>
        <h1 className="mt-2 text-center font-display text-4xl font-bold">
          {mode === "signin" ? "Sign in to your account" : "Create your account"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Your saved spots and preferences sync across every device.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 w-full rounded-3xl border border-border bg-card/60 p-6 shadow-luxury"
        >
          {mode === "signup" && (
            <div className="mb-4">
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full name
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          )}
          <div className="mb-4">
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="mb-6">
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-gold text-background hover:bg-gold/90"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-xs font-semibold uppercase tracking-wider text-gold hover:underline"
        >
          {mode === "signin"
            ? "No account yet? Sign up →"
            : "Already have an account? Sign in →"}
        </button>
      </div>
    </div>
  );
}
