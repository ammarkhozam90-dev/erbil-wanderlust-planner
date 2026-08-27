import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Heart } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";

const navItems = [
  { to: "/plan", label: "Plan My Day" },
  { to: "/guide", label: "Living in Erbil" },
  { to: "/offers", label: "Offers" },
  { to: "/favorites", label: "Favorites" },
] as const;

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 lg:px-8">
        <Link to="/" className="flex shrink-0 items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold text-primary">Erbil</span>
          <span className="font-display text-2xl font-bold text-gold">Go</span>
          <span className="ml-2 hidden text-xs text-muted-foreground lg:inline">
            Your day. Your way.
          </span>
        </Link>

        <nav className="absolute left-1/2 hidden h-16 -translate-x-1/2 items-center gap-8 md:flex">
          {navItems.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative text-sm font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
                {active && (
                  <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-primary" />
                )}
              </Link>
            );
          })}
          <div className="group relative h-16">
            <button
              type="button"
              className={`flex h-full items-center gap-1 text-sm font-medium transition-colors ${pathname.startsWith("/category/") ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-haspopup="menu"
            >
              Categories
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="pointer-events-none invisible absolute left-1/2 top-[calc(100%-1px)] z-50 w-64 -translate-x-1/2 translate-y-2 rounded-2xl border border-gold/20 bg-background/95 p-2 opacity-0 shadow-luxury backdrop-blur-xl transition-all group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {CATEGORIES.map((category) => (
                <Link
                  key={category.slug}
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-gold/10 hover:text-gold ${pathname === `/category/${category.slug}` ? "bg-gold/10 text-gold" : "text-muted-foreground"}`}
                  role="menuitem"
                >
                  <span>{category.title}</span>
                  <span className="text-[10px] text-muted-foreground">Explore</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            to="/favorites"
            aria-label="Open favorites"
            className={`grid h-9 w-9 place-items-center rounded-full border transition-all hover:border-gold/60 hover:text-gold ${pathname.startsWith("/favorites") ? "border-gold/60 text-gold" : "border-border/70 text-muted-foreground"}`}
          >
            <Heart className="h-4 w-4" />
          </Link>
          <NotificationBell />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>

      <nav className="flex items-center justify-center gap-6 overflow-x-auto border-t border-border/40 px-4 py-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`whitespace-nowrap text-xs font-medium transition-colors ${pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to)) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {item.label}
          </Link>
        ))}
        <details className="relative shrink-0">
          <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground marker:hidden">
            Categories <ChevronDown className="h-3 w-3" />
          </summary>
          <div className="absolute right-0 top-7 z-50 w-56 rounded-2xl border border-gold/20 bg-background/95 p-2 shadow-luxury backdrop-blur-xl">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                to="/category/$slug"
                params={{ slug: category.slug }}
                className={`block rounded-xl px-3 py-2.5 text-left text-xs transition-colors hover:bg-gold/10 hover:text-gold ${pathname === `/category/${category.slug}` ? "bg-gold/10 text-gold" : "text-muted-foreground"}`}
              >
                {category.title}
              </Link>
            ))}
          </div>
        </details>
      </nav>
    </header>
  );
}
