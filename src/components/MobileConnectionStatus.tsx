import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { isNativeApp } from "@/lib/platform";

/** Shows a compact recovery banner only when the native app is offline. */
export function MobileConnectionStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    if (!isNativeApp()) return;

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isNativeApp() || online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[80] border-b border-gold/20 bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] shadow-luxury backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
          <WifiOff className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">You’re offline</p>
          <p className="text-xs text-muted-foreground">
            Check your connection. Your saved app content is still available where possible.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold/30 px-3 py-2 text-xs font-semibold text-gold transition hover:bg-gold/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}
