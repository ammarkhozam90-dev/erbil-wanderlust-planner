import { Link, useRouterState } from "@tanstack/react-router";
import { MapPin, Sun } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navItems = [
    { to: "/", label: "Plan My Day" },
    { to: "/guide", label: "Living in Erbil" },
    { to: "/merchant/login", label: "Merchants" },
    { to: "/admin/dashboard", label: "Admin" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 lg:px-8">
        <Link to="/" className="flex items-baseline gap-1.5 shrink-0">
          <span className="font-display text-2xl font-bold text-primary">Erbil</span>
          <span className="font-display text-2xl font-bold text-gold">Go</span>
          <span className="ml-2 hidden text-xs text-muted-foreground lg:inline">Your day. Your way.</span>
        </Link>
        <nav className="mx-auto hidden items-center gap-8 md:flex">
          {navItems.map((n) => {
            const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`relative text-sm font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
                {active && <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-primary" />}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs sm:flex">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Erbil</span>
            <span className="text-border">|</span>
            <Sun className="h-3.5 w-3.5 text-gold" />
            <span className="font-medium">28°C</span>
          </div>
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
