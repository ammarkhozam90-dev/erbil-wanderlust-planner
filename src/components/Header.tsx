import { Link, useRouterState } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';

const navItems = [
  { to: '/plan', label: 'Plan My Day' },
  { to: '/guide', label: 'Living in Erbil' },
  { to: '/offers', label: 'Offers' },
  { to: '/favorites', label: 'Favorites' },
] as const;

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 lg:px-8">
        <Link to="/" className="flex shrink-0 items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold text-primary">Erbil</span>
          <span className="font-display text-2xl font-bold text-gold">Go</span>
          <span className="ml-2 hidden text-xs text-muted-foreground lg:inline">Your day. Your way.</span>
        </Link>

        <nav className="mx-auto hidden items-center gap-8 md:flex">
          {navItems.map((item) => {
            const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
            return <Link key={item.to} to={item.to} className={`relative text-sm font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {item.label}
              {active && <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-primary" />}
            </Link>;
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link to="/favorites" aria-label="Open favorites" className={`grid h-9 w-9 place-items-center rounded-full border transition-all hover:border-gold/60 hover:text-gold ${pathname.startsWith('/favorites') ? 'border-gold/60 text-gold' : 'border-border/70 text-muted-foreground'}`}>
            <Heart className="h-4 w-4" />
          </Link>
          <NotificationBell />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>

      <nav className="flex items-center justify-center gap-6 overflow-x-auto border-t border-border/40 px-4 py-2 md:hidden">
        {navItems.map((item) => <Link key={item.to} to={item.to} className={`whitespace-nowrap text-xs font-medium transition-colors ${pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to)) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{item.label}</Link>)}
      </nav>
    </header>
  );
}
