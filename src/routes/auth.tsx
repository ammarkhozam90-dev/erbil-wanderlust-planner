import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <h1 className="text-2xl font-bold mb-8">{mode === "signin" ? "Sign In" : "Create Account"}</h1>
        <div className="w-full rounded-2xl border p-6 shadow-sm">
          {mode === "signin" ? (
            <SignInForm onSignIn={signIn} navigate={navigate} />
          ) : (
            <SignUpForm onSignUp={signUp} navigate={navigate} />
          )}
          <button 
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SignInForm({ onSignIn, navigate }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await onSignIn(email, password);
      if (res?.error) throw new Error(typeof res.error === 'string' ? res.error : "Login failed");
      toast.success("Welcome back!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <Button disabled={busy} className="w-full">{busy ? "Signing in..." : "Sign in"}</Button>
    </form>
  );
}

function SignUpForm({ onSignUp, navigate }: any) {
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await onSignUp(form.email, form.password, { fullName: form.fullName });
      if (res?.error) throw new Error(typeof res.error === 'string' ? res.error : "Signup failed");
      toast.success("Account created successfully!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} required />
      <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
      <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
      <Button disabled={busy} className="w-full">{busy ? "Creating..." : "Create Account"}</Button>
    </form>
  );
}
