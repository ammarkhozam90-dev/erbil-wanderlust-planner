import { Link, useNavigate } from "@tanstack/react-router";
import { User, Settings, History, LogOut, LogIn, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

export function UserMenu() {
  const { session, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!session) {
    return (
      <Link
        to="/auth"
        className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-gold transition-colors hover:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span>Sign In / Sign Up</span>
      </Link>
    );
  }

  const displayName = profile?.full_name?.trim() || session.user.email || "You";
  const email = session.user.email ?? "";
  const initial = (displayName[0] ?? "U").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group relative h-9 w-9 overflow-hidden rounded-full border border-gold/60 bg-gradient-to-br from-gold/20 to-primary/10 transition-all hover:ring-2 hover:ring-gold/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label="Open user menu"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center font-display text-base font-bold text-gold">
            {initial}
          </span>
        )}
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-semibold text-foreground">{displayName}</span>
          <span className="text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2">
            <User className="h-4 w-4 text-gold" />
            <span>My Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gold" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile" hash="history" className="flex items-center gap-2">
            <History className="h-4 w-4 text-gold" />
            <span>History</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/merchant/auth" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <span>Share Your Business</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/admin" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gold" />
                <span>Admin Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
