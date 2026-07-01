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
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 md:py-16">
        <h1 className="mt-2 text-center font-display text-3xl font-bold md:text-4xl">
          {mode === "signin" ? "Sign in to your account" : mode === "signup" ? "Create your account" : "Forgot your password?"}
        </h1>
        <div className="mt-8 w-full rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
          {mode === "signin" && <SignInForm onSignIn={signIn} onForgot={() => setMode("forgot")} navigate={navigate} />}
          {mode === "signup" && <SignUpForm onSignUp={signUp} navigate={navigate} />}
          {mode === "forgot" && <ForgotForm onReset={resetPassword} onBack={() => setMode("signin")} />}
        </div>
        {mode !== "forgot" && (
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-6 text-xs font-semibold uppercase tracking-wider text-gold hover:underline">
            {mode === "signin" ? "No account yet? Sign up →" : "Already have an account? Sign in →"}
          </button>
        )}
      </div>
    </div>
  );
}

function SignInForm({ onSignIn, onForgot, navigate }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await onSignIn(email.trim(), password);
    setBusy(false);
    if (res.error) {
      // حماية من الانهيار: تحويل أي نوع خطأ إلى نص
      toast.error(typeof res.error === 'string' ? res.error : "Invalid login credentials");
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-4"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="mb-2"><Label>Password</Label><PasswordInput value={password} onChange={setPassword} /></div>
      <Button type="submit" disabled={busy} className="w-full bg-gold text-background">{busy ? "Signing in..." : "Sign in"}</Button>
    </form>
  );
}

function SignUpForm({ onSignUp, navigate }: any) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirm: "", ageRange: "", gender: "", nationality: "" });

  async function submit() {
    setBusy(true);
    const res = await onSignUp(form.email.trim(), form.password, { fullName: form.fullName.trim() });
    setBusy(false);
    if (res.error) {
      // حماية من الانهيار: التأكد من عرض الخطأ كنص فقط
      const errorMessage = typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
      toast.error(errorMessage);
      return;
    }
    navigate({ to: "/profile" });
  }

  return (
    <div>
      {step === 1 ? (
        <div className="space-y-4">
          <Input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
          <PasswordInput value={form.password} onChange={(v) => setForm({...form, password: v})} />
          <Button onClick={() => setStep(2)} className="w-full bg-gold">Continue</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Input placeholder="Nationality" value={form.nationality} onChange={(e) => setForm({...form, nationality: e.target.value})} />
          <Button onClick={submit} disabled={busy} className="w-full bg-gold">{busy ? "Creating..." : "Create account"}</Button>
        </div>
      )}
    </div>
  );
}

function PasswordInput({ value, onChange }: any) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ForgotForm({ onReset, onBack }: any) {
    const [email, setEmail] = useState("");
    return (
        <form onSubmit={async (e) => { e.preventDefault(); await onReset(email); }}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <Button type="submit" className="mt-4 w-full">Send Reset Link</Button>
        </form>
    )
}
