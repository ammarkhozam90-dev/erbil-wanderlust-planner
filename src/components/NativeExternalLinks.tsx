import { useEffect } from "react";
import { isNativeApp } from "@/lib/native-auth";
import { openExternalUrl } from "@/lib/native-external-links";

function isExternalAnchor(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("/")) return false;

  try {
    const url = new URL(href, window.location.href);
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/** Keeps target=_blank links out of the app's main WebView. */
export function NativeExternalLinks() {
  useEffect(() => {
    if (!isNativeApp()) return;

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[target='_blank']");
      if (!(anchor instanceof HTMLAnchorElement) || !isExternalAnchor(anchor)) return;

      const href = anchor.href;
      event.preventDefault();
      void openExternalUrl(href);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
