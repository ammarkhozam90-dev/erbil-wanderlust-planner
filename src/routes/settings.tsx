import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Check, X, Loader2, KeyRound, Monitor, Lock, UserMinus, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth, PASSWORD_RULES, validatePassword } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ErbilGo" },
      { name: "description", content: "Manage your ErbilGo account security, password, sessions, and account deletion." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session, loading, changePassword, deleteAccount, signOut } = useAuth();
  const navigate = useNavigate();

  // Change Password State
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", new: "", confirm: "" });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdShow1, setPwdShow1] = useState(false);
  const [pwdShow2, setPwdShow2] = useState(false);
  const [pwdShow3, setPwdShow3] = useState(false);

  // Delete Account State
  const [showDelete, setShowDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // These hooks must run on every render regardless of session/loading state.
  const pwdValid = validatePassword(pwdForm.new);
  const pwdMatch = pwdForm.new.length > 0 && pwdForm.new === pwdForm.confirm;

  async function onUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwdValid.ok || !pwdMatch) return;
    setPwdBusy(true);
    const res = await changePassword(pwdForm.current, pwdForm.new);
    setPwdBusy(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Password updated successfully. Signing out...");
      setShowPwd(false);
      setPwdForm({ current: "", new: "", confirm: "" });
      setTimeout(() => {
        navigate({ to: "/auth" });
      }, 1500);
    }
  }

  async function onDeleteAccount() {
    setDeleteBusy(true);
    const res = await deleteAccount();
    setDeleteBusy(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Account deleted successfully");
      setShowDelete(false);
      navigate({ to: "/" });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className="text-sm text-muted-foreground">Loading your settings…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-4xl font-bold">Sign in to view settings</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Manage your password, sessions, and account from here.
          </p>
          <Button
            onClick={() => navigate({ to: "/auth" })}
            className="mt-6 bg-gold text-background hover:bg-gold/90"
          >
            Sign In / Sign Up
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
        <h1 className="mb-8 font-display text-3xl font-bold lg:text-4xl">Settings</h1>

        {/* Security & Privacy */}
        <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
          <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-bold">
            <Lock className="h-5 w-5 text-gold" /> Security & Privacy
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/40 p-4 transition-colors hover:border-gold/30">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-gold/10 p-2 text-gold"><KeyRound className="h-4 w-4" /></div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider">Password</p>
                  <p className="text-[11px] text-muted-foreground">Change your account password</p>
                </div>
                <Dialog open={showPwd} onOpenChange={setShowPwd}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Update</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Update Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password to set a new one. You will be signed out after a successful update.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onUpdatePassword} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Current Password</Label>
                        <PwdInput value={pwdForm.current} onChange={(v) => setPwdForm({ ...pwdForm, current: v })} show={pwdShow1} setShow={setPwdShow1} />
                      </div>
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <PwdInput value={pwdForm.new} onChange={(v) => setPwdForm({ ...pwdForm, new: v })} show={pwdShow2} setShow={setPwdShow2} autoComplete="new-password" />
                        <ul className="mt-2 grid gap-1 text-[10px]">
                          {PASSWORD_RULES.map((r) => {
                            const ok = r.test(pwdForm.new);
                            return (
                              <li key={r.id} className={`flex items-center gap-1.5 ${ok ? "text-emerald-500" : "text-muted-foreground"}`}>
                                {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {r.label}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <PwdInput value={pwdForm.confirm} onChange={(v) => setPwdForm({ ...pwdForm, confirm: v })} show={pwdShow3} setShow={setPwdShow3} autoComplete="new-password" />
                        {pwdForm.confirm.length > 0 && (
                          <p className={`mt-1 text-[10px] ${pwdMatch ? "text-emerald-500" : "text-destructive"}`}>
                            {pwdMatch ? "Passwords match" : "Passwords do not match"}
                          </p>
                        )}
                      </div>
                      <DialogFooter className="mt-6">
                        <Button type="submit" disabled={pwdBusy || !pwdValid.ok || !pwdMatch} className="w-full bg-gold text-background hover:bg-gold/90">
                          {pwdBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Update Password
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/40 p-4 transition-colors hover:border-gold/30">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-gold/10 p-2 text-gold"><Monitor className="h-4 w-4" /></div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider">Sessions</p>
                  <p className="text-[11px] text-muted-foreground">Manage active devices</p>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">View</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mt-8 rounded-3xl border border-destructive/20 bg-destructive/5 p-6 shadow-luxury">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-destructive">
            <UserMinus className="h-5 w-5" /> Danger Zone
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Dialog open={showDelete} onOpenChange={setShowDelete}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove your data from our servers.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
                <Button variant="destructive" onClick={onDeleteAccount} disabled={deleteBusy}>
                  {deleteBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Yes, Delete My Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </div>
  );
}

function PwdInput({
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
