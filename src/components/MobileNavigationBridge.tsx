import { useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { isNativeApp } from "@/lib/native-auth";

/**
 * Native navigation bridge for the Capacitor build.
 *
 * Android's back button should behave like an app navigation control:
 * close an open mobile overlay first, then go back through the SPA history.
 * The normal website is not affected.
 */
export function MobileNavigationBridge() {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (!isNativeApp()) return;

    const capacitor = (window as Window & {
      Capacitor?: {
        getPlatform?: () => string;
        Plugins?: {
          App?: {
            addListener?: (
              event: "backButton",
              callback: (event: { canGoBack?: boolean }) => void,
            ) =>
              | { remove?: () => Promise<void> | void }
              | Promise<{ remove?: () => Promise<void> | void }>;
            exitApp?: () => Promise<void>;
          };
        };
      };
    }).Capacitor;

    if (capacitor?.getPlatform?.() !== "android") return;

    const app = capacitor.Plugins?.App;
    if (!app?.addListener) return;

    let active = true;
    let registration: { remove?: () => Promise<void> | void } | null = null;

    const handleBack = () => {
      if (!active) return;

      // MobileBottomNav and other app overlays mark themselves with this
      // attribute. Closing an overlay takes priority over route navigation.
      const overlay = document.querySelector<HTMLElement>(
        '[data-mobile-overlay="true"]',
      );
      if (overlay) {
        window.dispatchEvent(new CustomEvent("erbilgo:close-mobile-overlays"));
        return;
      }

      if (pathname !== "/") {
        router.history.back();
        return;
      }

      // At the app root, close the native app instead of leaving the user on a
      // dead-end page. This is Android's expected tab/back behavior.
      void app.exitApp?.();
    };

    try {
      const listener = app.addListener("backButton", handleBack);
      if (listener && typeof (listener as Promise<unknown>).then === "function") {
        void (listener as Promise<{ remove?: () => Promise<void> | void }>)
          .then((resolved) => {
            if (active) registration = resolved;
            else void resolved.remove?.();
          })
          .catch((error) => {
            console.warn("[mobile-navigation] Could not register Android back button", error);
          });
      } else if (active) {
        registration = listener;
      } else {
        void listener.remove?.();
      }
    } catch (error) {
      console.warn("[mobile-navigation] Could not register Android back button", error);
    }

    return () => {
      active = false;
      void registration?.remove?.();
    };
  }, [pathname, router]);

  return null;
}
