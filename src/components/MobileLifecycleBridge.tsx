import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isNativeApp } from "@/lib/native-auth";
import { supabase } from "@/integrations/supabase/client";

const NATIVE_AUTH_CALLBACK = "com.erbilgo.app://auth/callback";

type ListenerHandle = { remove?: () => Promise<void> | void };
type CapacitorApp = {
  addListener?: (
    event: "appStateChange" | "appUrlOpen",
    callback: (payload: { isActive?: boolean; url?: string }) => void,
  ) => ListenerHandle | Promise<ListenerHandle>;
  getLaunchUrl?: () => Promise<{ url?: string } | undefined> | { url?: string } | undefined;
};

function getAppPlugin(): CapacitorApp | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { Capacitor?: { Plugins?: { App?: CapacitorApp } } }).Capacitor?.Plugins?.App;
}

function isThenable<T>(value: unknown): value is Promise<T> {
  return !!value && typeof (value as Promise<unknown>).then === "function";
}

function sharedPlanIdFromUrl(rawUrl: string): string | null {
  if (!rawUrl || rawUrl.startsWith(NATIVE_AUTH_CALLBACK)) return null;

  try {
    const url = new URL(rawUrl);
    const match = url.pathname.match(/^\/shared-plan\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** Keeps auth and shared-plan navigation reliable when the native app resumes or opens a deep link. */
export function MobileLifecycleBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp()) return;
    const app = getAppPlugin();
    if (!app?.addListener) return;

    let active = true;
    const registrations: ListenerHandle[] = [];

    const refreshSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) return;
        await supabase.auth.refreshSession();
      } catch (error) {
        console.warn("[native-lifecycle] Could not restore the session", error);
      }
    };

    const handleUrl = (rawUrl?: string) => {
      if (!active || !rawUrl) return;
      const itineraryId = sharedPlanIdFromUrl(rawUrl);
      if (!itineraryId) return;

      void navigate({
        to: "/shared-plan/$id",
        params: { id: itineraryId },
      });
    };

    const register = (
      result: ListenerHandle | Promise<ListenerHandle>,
      label: string,
    ) => {
      if (isThenable(result)) {
        void result
          .then((listener) => {
            if (active) registrations.push(listener);
            else void listener.remove?.();
          })
          .catch((error) => console.warn(`[native-lifecycle] Could not register ${label}`, error));
      } else if (active) {
        registrations.push(result);
      } else {
        void result.remove?.();
      }
    };

    register(
      app.addListener("appStateChange", ({ isActive: appIsActive }) => {
        if (appIsActive) void refreshSession();
      }),
      "app state listener",
    );
    register(app.addListener("appUrlOpen", ({ url }) => handleUrl(url)), "deep-link listener");

    const launchUrl = app.getLaunchUrl?.();
    if (launchUrl && isThenable(launchUrl)) {
      void launchUrl.then((launch) => handleUrl(launch?.url)).catch(() => {});
    } else {
      handleUrl(launchUrl?.url);
    }

    return () => {
      active = false;
      registrations.forEach((listener) => {
        void listener.remove?.();
      });
    };
  }, [navigate]);

  return null;
}
