import { useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { X, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";

const TONES = {
  info: "bg-gold/15 text-foreground border-gold/30",
  promo: "bg-primary text-primary-foreground border-primary",
  warning: "bg-destructive/15 text-foreground border-destructive/40",
} as const;

export function AnnouncementBar() {
  const { settings } = useSiteSettings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [closedText, setClosedText] = useState<string | null>(null);
  const a = settings.announcement;

  if (!a.enabled || !a.text.trim()) return null;
  if (pathname.startsWith("/admin")) return null;
  if (closedText === a.text) return null;

  return (
    <div className={`relative border-b px-10 py-2 text-center text-sm ${TONES[a.tone]}`}>
      <span>{a.text}</span>
      {a.link_url && a.link_label && (
        <a href={a.link_url} className="ml-2 font-semibold underline underline-offset-4">
          {a.link_label}
        </a>
      )}
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => setClosedText(a.text)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** When maintenance is on, everyone except admins sees a maintenance page. /auth stays reachable so admins can sign in. */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { settings } = useSiteSettings();
  const { isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const blocked =
    settings.maintenance.enabled &&
    !isAdmin &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/admin");

  if (!blocked) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
          <Wrench className="h-6 w-6 text-gold" />
        </div>
        <h1 className="font-display text-4xl font-bold">
          Erbil<span className="text-gold">Go</span>
        </h1>
        <p className="text-muted-foreground">{settings.maintenance.message}</p>
      </div>
    </div>
  );
}
