import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Check, X, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, validatePassword, PASSWORD_RULES } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 md:py-16">
        <h1 className="text-3xl font-bold font-display">{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}</h1>
        
        <div className="mt-8 w-full rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
          {mode === "signin" && <SignInForm onSignIn={signIn} onForgot={() => setMode("forgot")} navigate={navigate} />}
          {mode === "signup" && <SignUpForm onSignUp={signUp} navigate={navigate} />}
          {mode === "forgot" && <ForgotForm onReset={resetPassword} onBack={() => setMode("signin")} />}
        </div>
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
    if (res?.error) {
      toast.error(typeof res.error === 'string' ? res.error : "Sign in failed");
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <form onSubmit={onSubmit}>
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4" />
      <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" disabled={busy} className="w-full mt-6 bg-gold">{busy ? "Signing in..." : "Sign in"}</Button>
    </form>
  );
}

function SignUpForm({ onSignUp, navigate }: any) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirm: "", ageRange: "", gender: "", nationality: "" });

  async function submit() {
    setBusy(true);
    const res = await onSignUp(form.email.trim(), form.password, { fullName: form.fullName });
    setBusy(false);
    
    if (res?.error) {
      toast.error(typeof res.error === 'string' ? res.error : "Signup failed");
      return;
    }
    
    toast.success("Account created!");
    navigate({ to: "/profile" }); // التوجيه المباشر لصفحة الملف الشخصي
  }

  return (
    <div>
      {step === 1 ? (
        <div className="space-y-4">
          <Input placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
          <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
          <Button onClick={() => setStep(2)} className="w-full bg-gold">Continue</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Input placeholder="Nationality" value={form.nationality} onChange={(e) => setForm({...form, nationality: e.target.value})} />
          <Button onClick={submit} disabled={busy} className="w-full bg-gold">{busy ? "Creating..." : "Complete Profile"}</Button>
        </div>
      )}
    </div>
  );
}

function ForgotForm({ onReset, onBack }: any) {
    const [email, setEmail] = useState("");
    return (
        <form onSubmit={async (e) => { e.preventDefault(); await onReset(email); }}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <Button type="submit" className="w-full mt-4 bg-gold">Send Reset Link</Button>
        </form>
    )
}
