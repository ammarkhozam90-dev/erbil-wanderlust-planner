import { isNativeApp } from "@/lib/platform";

type CapacitorRuntime = {
  Plugins?: {
    Browser?: {
      open?: (options: { url: string }) => Promise<unknown> | unknown;
    };
  };
};

function getCapacitor(): CapacitorRuntime | undefined {
  return typeof window === "undefined" ? undefined : (window as Window & { Capacitor?: CapacitorRuntime }).Capacitor;
}

function isExternalHttpUrl(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

/** Opens external destinations without navigating the Capacitor WebView away from ErbilGo. */
export async function openExternalUrl(href: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }

  if (!isNativeApp()) {
    window.open(url.href, "_blank", "noopener,noreferrer");
    return true;
  }

  // Phone, email and installed-app schemes should be handed to Android/iOS.
  if (!isExternalHttpUrl(url)) {
    window.location.href = url.href;
    return true;
  }

  const browser = getCapacitor()?.Plugins?.Browser;
  if (browser?.open) {
    try {
      await browser.open({ url: url.href });
      return true;
    } catch (error) {
      console.warn("[native-links] Browser plugin could not open URL", error);
    }
  }

  const opened = window.open(url.href, "_blank", "noopener,noreferrer");
  if (!opened) window.location.href = url.href;
  return true;
}
