import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, validatePassword, PASSWORD_RULES } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ErbilGo" },
      { name: "description", content: "Set a new password for your ErbilGo account." },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://erbil-wanderlust-planner.lovable.app/reset-password" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase processes the recovery token in the URL hash on load and
    // emits a PASSWORD_RECOVERY event; either way a session must exist before
    // we can call updateUser().
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const check = validatePassword(pwd);
  const match = pwd.length > 0 && pwd === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!check.ok) {
      toast.error("Password does not meet the required rules");
      return;
    }
    if (!match) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    const res = await updatePassword(pwd);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Password updated — you're all set");
    navigate({ to: "/profile" });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Secure</p>
        <h1 className="mt-2 text-center font-display text-3xl font-bold md:text-4xl">Set a new password</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Choose a strong password you don't use anywhere else.
        </p>

        <form onSubmit={submit} className="mt-8 w-full rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
          {!ready && (
            <p className="mb-4 rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground">
              Waiting for the reset link to be verified… If nothing happens, request a new link from the sign-in page.
            </p>
          )}
          <div className="mb-4">
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">New password</Label>
            <PwdInput value={pwd} onChange={setPwd} show={show} setShow={setShow} />
            <ul className="mt-2 grid gap-1 text-[11px]">
              {PASSWORD_RULES.map((r) => {
                const ok = r.test(pwd);
                return (
                  <li key={r.id} className={`flex items-center gap-1.5 ${ok ? "text-emerald-500" : "text-muted-foreground"}`}>
                    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {r.label}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mb-6">
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm password</Label>
            <PwdInput value={confirm} onChange={setConfirm} show={show2} setShow={setShow2} />
            {confirm.length > 0 && (
              <p className={`mt-1 text-[11px] ${match ? "text-emerald-500" : "text-destructive"}`}>
                {match ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
          </div>
          <Button type="submit" disabled={busy || !ready} className="w-full bg-gold text-background hover:bg-gold/90">
            {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…</>) : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function PwdInput({
  value, onChange, show, setShow,
}: { value: string; onChange: (v: string) => void; show: boolean; setShow: (b: boolean) => void }) {
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
