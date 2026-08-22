import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Instagram, Mail, MapPin } from "lucide-react";

const publicLinks = [
  { to: "/", label: "Plan my day" },
  { to: "/guide", label: "Living in Erbil" },
  { to: "/offers", label: "Offers" },
  { to: "/favorites", label: "Favorites" },
] as const;

export function Footer() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // Keep operational workspaces focused; the public footer belongs to the discovery experience.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/merchant") ||
    pathname.startsWith("/auth")
  )
    return null;

  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-[1600px] px-4 py-10 lg:px-8 lg:py-12">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="max-w-sm">
            <Link to="/" className="inline-flex items-baseline gap-1.5" aria-label="ErbilGo home">
              <span className="font-display text-2xl font-bold text-primary">Erbil</span>
              <span className="font-display text-2xl font-bold text-gold">Go</span>
            </Link>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Your day in Erbil, thoughtfully planned. Discover places, offers and local stories in
              one calm, useful guide.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-gold" /> Erbil, Kurdistan Region
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Explore</h2>
            <nav className="mt-3 grid gap-2.5" aria-label="Explore links">
              {publicLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="w-fit text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
              About ErbilGo
            </h2>
            <nav className="mt-3 grid gap-2.5" aria-label="About links">
              <Link
                to="/our-guide"
                className="w-fit text-sm text-muted-foreground transition hover:text-foreground"
              >
                Our local guide
              </Link>
              <a
                href="mailto:hello@erbilgo.app"
                className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5" /> Contact us
              </a>
              <a
                href="mailto:partners@erbilgo.app?subject=Partner%20with%20ErbilGo"
                className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
              >
                Partner with us <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </nav>
          </div>

          <div className="rounded-2xl border border-gold/15 bg-gold/5 p-4">
            <h2 className="font-display text-lg font-bold">Know a place worth finding?</h2>
            <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
              Help visitors discover the businesses and experiences that make Erbil special.
            </p>
            <Link
              to="/auth"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold transition hover:text-primary"
            >
              Share your business <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border/50 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ErbilGo. Made for better days in Erbil.</p>
          <div className="flex items-center gap-4">
            <a
              href="mailto:hello@erbilgo.app"
              aria-label="Email ErbilGo"
              className="transition hover:text-gold"
            >
              <Mail className="h-4 w-4" />
            </a>
            <a
              href="https://instagram.com/erbilgo"
              target="_blank"
              rel="noreferrer"
              aria-label="ErbilGo on Instagram"
              className="transition hover:text-gold"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <span>Discover locally. Travel thoughtfully.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
