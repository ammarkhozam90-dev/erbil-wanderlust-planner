import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Check, X, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth, validatePassword, PASSWORD_RULES } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — ErbilGo" },
      { name: "description", content: "Sign in or create your ErbilGo account to sync saved spots, preferences, and itineraries across all your devices." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Sign In — ErbilGo" },
      { property: "og:url", content: "https://erbil-wanderlust-planner.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://erbil-wanderlust-planner.lovable.app/auth" }],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

function AuthPage() {
  const { session, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");

  useEffect(() => {
    if (session) navigate({ to: "/profile" });
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Join ErbilGo" : "Reset password"}
        </p>
        <h1 className="mt-2 text-center font-display text-3xl font-bold md:text-4xl">
          {mode === "signin" ? "Sign in to your account" : mode === "signup" ? "Create your account" : "Forgot your password?"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === "forgot"
            ? "We'll email you a secure link to set a new password."
            : "Your saved spots and preferences sync across every device."}
        </p>

        <div className="mt-8 w-full rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
          {mode === "signin" && <SignInForm onSignIn={signIn} onForgot={() => setMode("forgot")} navigate={navigate} />}
          {mode === "signup" && <SignUpForm onSignUp={signUp} navigate={navigate} />}
          {mode === "forgot" && <ForgotForm onReset={resetPassword} onBack={() => setMode("signin")} />}
        </div>

        {mode !== "forgot" && (
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 text-xs font-semibold uppercase tracking-wider text-gold hover:underline"
          >
            {mode === "signin" ? "No account yet? Sign up →" : "Already have an account? Sign in →"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================== SIGN IN ============================== */

function SignInForm({
  onSignIn,
  onForgot,
  navigate,
}: {
  onSignIn: (e: string, p: string) => Promise<{ error: string | null }>;
  onForgot: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await onSignIn(email.trim(), password);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/profile" });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-4">
        <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="mb-2">
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
          <button type="button" onClick={onForgot} className="text-[11px] font-semibold uppercase tracking-wider text-gold hover:underline">
            Forgot?
          </button>
        </div>
        <PasswordInput value={password} onChange={setPassword} show={show} setShow={setShow} autoComplete="current-password" />
      </div>
      <Button type="submit" disabled={busy} className="mt-6 w-full bg-gold text-background hover:bg-gold/90">
        {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>) : "Sign in"}
      </Button>
    </form>
  );
}

/* ============================== SIGN UP ============================== */

function SignUpForm({
  onSignUp,
  navigate,
}: {
  onSignUp: ReturnType<typeof useAuth>["signUp"];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    ageRange: "",
    gender: "",
    nationality: "",
  });

  const pwd = validatePassword(form.password);
  const passwordsMatch = form.password.length > 0 && form.password === form.confirm;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const step1Valid =
    form.fullName.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    form.phone.trim().length >= 5 &&
    pwd.ok &&
    passwordsMatch;

  const step2Valid = form.ageRange && form.gender && form.nationality.trim().length >= 2;

  async function submit() {
    setBusy(true);
    const res = await onSignUp(form.email.trim(), form.password, {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      ageRange: form.ageRange,
      gender: form.gender,
      nationality: form.nationality.trim(),
    });
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.needsConfirm) {
      toast.success("Check your email to confirm your account");
    } else {
      toast.success("Welcome to ErbilGo");
      navigate({ to: "/profile" });
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${step >= s ? "bg-gold" : "bg-border"}`} />
            <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${step >= s ? "text-gold" : "text-muted-foreground"}`}>
              Step {s} of 2
            </p>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <Row label="Full name">
            <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Your name" autoComplete="name" />
          </Row>
          <Row label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
          </Row>
          <Row label="Phone number">
            <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+964 …" autoComplete="tel" />
          </Row>
          <Row label="Password">
            <PasswordInput value={form.password} onChange={(v) => set("password", v)} show={show} setShow={setShow} autoComplete="new-password" />
            <ul className="mt-2 grid gap-1 text-[11px]">
              {PASSWORD_RULES.map((r) => {
                const ok = r.test(form.password);
                return (
                  <li key={r.id} className={`flex items-center gap-1.5 ${ok ? "text-emerald-500" : "text-muted-foreground"}`}>
                    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {r.label}
                  </li>
                );
              })}
            </ul>
          </Row>
          <Row label="Confirm password">
            <PasswordInput value={form.confirm} onChange={(v) => set("confirm", v)} show={show2} setShow={setShow2} autoComplete="new-password" />
            {form.confirm.length > 0 && (
              <p className={`mt-1 text-[11px] ${passwordsMatch ? "text-emerald-500" : "text-destructive"}`}>
                {passwordsMatch ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
          </Row>

          <Button
            type="button"
            disabled={!step1Valid}
            onClick={() => setStep(2)}
            className="w-full bg-gold text-background hover:bg-gold/90"
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Row label="Age range">
            <Select value={form.ageRange} onValueChange={(v) => set("ageRange", v)}>
              <SelectTrigger><SelectValue placeholder="Select age range" /></SelectTrigger>
              <SelectContent>{AGE_RANGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </Row>
          <Row label="Gender">
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </Row>
          <Row label="Nationality">
            <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="e.g. Iraqi" />
          </Row>

          <p className="text-[11px] text-muted-foreground">
            You can add travel preferences, interests and more from your profile after signing up.
          </p>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              type="button"
              disabled={!step2Valid || busy}
              onClick={submit}
              className="flex-1 bg-gold text-background hover:bg-gold/90"
            >
              {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</>) : "Create account"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== FORGOT ============================== */

function ForgotForm({
  onReset,
  onBack,
}: {
  onReset: (email: string) => Promise<{ error: string | null }>;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await onReset(email.trim());
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setSent(true);
    toast.success("Reset link sent — check your inbox");
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-sm">
          If an account exists for <span className="font-semibold text-gold">{email}</span>, you'll receive a password reset link shortly.
        </p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <Row label="Email">
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </Row>
      <Button type="submit" disabled={busy} className="mt-4 w-full bg-gold text-background hover:bg-gold/90">
        {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>) : "Send reset link"}
      </Button>
      <button type="button" onClick={onBack} className="mt-4 w-full text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        ← Back to sign in
      </button>
    </form>
  );
}

/* ============================== SHARED ============================== */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function PasswordInput({
  value, onChange, show, setShow, autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (b: boolean) => void;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
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
