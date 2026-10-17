import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Home, LayoutGrid, Sparkles, User, X } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { useAuth } from "@/lib/auth";

/**
 * App-style bottom tab bar. Mobile only (md:hidden), so the desktop site is untouched.
 * Hidden on admin / merchant / auth screens.
 */
const HIDDEN_PREFIXES = ["/admin", "/merchant", "/auth", "/reset-password"];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close the categories sheet whenever the route changes.
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  const isHome = pathname === "/";
  const isExplore = pathname.startsWith("/category/") || sheetOpen;
  const isPlan = pathname.startsWith("/plan");
  const isFavorites = pathname.startsWith("/favorites");
  const isProfile = pathname.startsWith("/profile");

  const tabClass = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
      active ? "text-primary" : "text-muted-foreground"
    }`;

  return (
    <>
      {/* Spacer so page content and footer are never hidden behind the bar */}
      <div
        className="md:hidden"
        aria-hidden="true"
        style={{ height: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      />

      {sheetOpen && (
        <div className="fixed inset-0 z-[55] md:hidden" role="dialog" aria-modal="true" aria-label="Browse categories">
          <button
            type="button"
            aria-label="Close categories"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-gold/20 bg-background p-4 shadow-luxury"
            style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="font-display text-xl font-bold text-foreground">Browse categories</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {CATEGORIES.map((category) => (
                <Link
                  key={category.slug}
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition-colors active:bg-gold/10 ${
                    pathname === `/category/${category.slug}` ? "bg-gold/10 text-gold" : "text-foreground"
                  }`}
                >
                  <span>{category.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-border/60 bg-background/90 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
          <Link to="/" className={tabClass(isHome)} aria-current={isHome ? "page" : undefined}>
            <Home className="h-5 w-5" />
            Home
          </Link>

          <button type="button" onClick={() => setSheetOpen((o) => !o)} className={tabClass(isExplore)} aria-expanded={sheetOpen}>
            <LayoutGrid className="h-5 w-5" />
            Explore
          </button>

          <Link
            to="/plan"
            aria-label="Plan My Day"
            aria-current={isPlan ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-start"
          >
            <span
              className={`-mt-5 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-luxury ring-4 ring-background transition-transform active:scale-95 ${
                isPlan ? "outline outline-2 outline-gold" : ""
              }`}
            >
              <Sparkles className="h-6 w-6" />
            </span>
            <span className={`mt-0.5 text-[11px] font-medium ${isPlan ? "text-primary" : "text-muted-foreground"}`}>Plan</span>
          </Link>

          <Link to={session ? "/favorites" : "/auth"} className={tabClass(isFavorites)} aria-current={isFavorites ? "page" : undefined}>
            <Heart className="h-5 w-5" />
            Favorites
          </Link>

          <Link to={session ? "/profile" : "/auth"} className={tabClass(isProfile)} aria-current={isProfile ? "page" : undefined}>
            <User className="h-5 w-5" />
            {session ? "Profile" : "Sign in"}
          </Link>
        </div>
      </nav>
    </>
  );
}
