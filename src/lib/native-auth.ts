// Google sign-in inside the Android/iOS app (Capacitor).
//
// In the app the normal web redirect does not work (the page lives at https://localhost,
// so Google would finish the login inside Chrome instead of the app). Here we:
//   1. open the Google login in an in-app browser tab,
//   2. let Supabase send the user back to  com.erbilgo.app://auth/callback  (opens the app),
//   3. read the tokens from that link and sign the user in.
// On the normal website none of this runs (isNativeApp() is false).
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const NATIVE_REDIRECT_URL = "com.erbilgo.app://auth/callback";

function getCapacitor(): any {
  return typeof window === "undefined" ? undefined : (window as any).Capacitor;
}

export function isNativeApp(): boolean {
  try {
    return !!getCapacitor()?.isNativePlatform?.();
  } catch {
    return false;
  }
}

async function finishSignIn(url: string): Promise<{ ok: boolean; message?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, message: "Invalid sign-in link." };
  }
  const query = parsed.searchParams;
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const read = (key: string) => hash.get(key) ?? query.get(key);

  const errorText = read("error_description") ?? read("error");
  if (errorText) return { ok: false, message: errorText.replace(/\+/g, " ") };

  const code = query.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }
  return { ok: false, message: "Sign-in did not return a session." };
}

let installed = false;

/** Call once when the app starts. Returns a cleanup function. Does nothing on the website. */
export function setupNativeAuth(): () => void {
  if (!isNativeApp() || installed) return () => {};
  const cap = getCapacitor();
  const App = cap?.Plugins?.App;
  const Browser = cap?.Plugins?.Browser;
  if (!App) return () => {};
  installed = true;

  let pending: ((result: { error: Error | null }) => void) | null = null;
  let completed = false;

  const handleUrl = async (url?: string) => {
    if (!url || !url.startsWith(NATIVE_REDIRECT_URL)) return;
    completed = true;
    try {
      await Browser?.close?.();
    } catch {
      /* the tab may already be closed */
    }
    const result = await finishSignIn(url);
    if (pending) {
      pending({ error: result.ok ? null : new Error(result.message ?? "Google sign-in failed") });
      pending = null;
    } else if (!result.ok) {
      toast.error(result.message ?? "Google sign-in failed");
    }
  };

  // Make the existing Google button use the in-app browser + deep link.
  const auth: any = supabase.auth;
  const originalSignInWithOAuth = auth.signInWithOAuth.bind(auth);
  auth.signInWithOAuth = async (credentials: any) => {
    completed = false;
    const result = await originalSignInWithOAuth({
      ...credentials,
      options: { ...credentials?.options, redirectTo: NATIVE_REDIRECT_URL, skipBrowserRedirect: true },
    });
    if (result.error || !result.data?.url) return result;
    if (!Browser) {
      window.location.href = result.data.url;
      return result;
    }
    return new Promise((resolve) => {
      pending = (r) =>
        resolve(
          r.error ? { data: { provider: result.data.provider, url: null }, error: r.error } : result,
        );
      Browser.open({ url: result.data.url }).catch((e: Error) => {
        pending = null;
        resolve({ data: { provider: result.data.provider, url: null }, error: e });
      });
    });
  };

  const listeners: any[] = [];
  listeners.push(App.addListener("appUrlOpen", (event: { url?: string }) => void handleUrl(event?.url)));
  // Tab closed without finishing (user pressed back): free the button.
  if (Browser?.addListener) {
    listeners.push(
      Browser.addListener("browserFinished", () => {
        setTimeout(() => {
          if (pending && !completed) {
            pending({ error: new Error("Sign-in was cancelled.") });
            pending = null;
          }
        }, 1200);
      }),
    );
  }
  // App was closed and opened by the sign-in link.
  Promise.resolve(App.getLaunchUrl?.())
    .then((launch: { url?: string } | undefined) => handleUrl(launch?.url))
    .catch(() => {});

  return () => {
    auth.signInWithOAuth = originalSignInWithOAuth;
    listeners.forEach((l) => Promise.resolve(l).then((h: any) => h?.remove?.()).catch(() => {}));
    installed = false;
  };
}
