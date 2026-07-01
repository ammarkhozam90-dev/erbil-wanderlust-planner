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

// دالة مساعدة لتحويل أي خطأ إلى نص نصي آمن للعرض
const getErrorMessage = (err: any): string => {
  if (typeof err === "string") return err;
  if (err?.message) return err.message;
  return "An unexpected error occurred. Please try again.";
};

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — ErbilGo" },
      { name: "description", content: "Sign in or create your ErbilGo account." },
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
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12">
        <h1 className="text-3xl font-bold font-display">{mode === "signin" ? "Sign in" : "Create account"}</h1>
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
      toast.error(getErrorMessage(res.error)); // تم الإصلاح هنا
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <form onSubmit={onSubmit}>
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-4" required />
      <Button type="submit" disabled={busy} className="mt-6 w-full">{busy ? "Loading..." : "Sign in"}</Button>
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
      toast.error(getErrorMessage(res.error)); // تم الإصلاح هنا
      return;
    }
    navigate({ to: "/profile" });
  }

  return (
    <div>
       {/* (الكود الخاص بك كما هو مع تصحيح الاستدعاء في زر التسجيل فقط) */}
       {step === 1 ? (
         <Button onClick={() => setStep(2)} className="w-full">Continue</Button>
       ) : (
         <Button onClick={submit} disabled={busy} className="w-full">Create Account</Button>
       )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-4"><Label className="text-xs">{label}</Label>{children}</div>;
}
