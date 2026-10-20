export type ShareResult = "shared" | "whatsapp" | "copied" | "cancelled";

function wasCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Uses the phone's native share sheet when available, then falls back to
 * WhatsApp, and finally to clipboard copy. Works on the website as well.
 */
export async function shareText({
  title,
  text,
  url,
}: {
  title: string;
  text: string;
  url?: string;
}): Promise<ShareResult> {
  const shareData: ShareData = { title, text, ...(url ? { url } : {}) };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch (error) {
      if (wasCancelled(error)) return "cancelled";
    }
  }

  const message = [text, url].filter(Boolean).join("\n\n");
  if (typeof window !== "undefined") {
    const whatsappWindow = window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    if (whatsappWindow) return "whatsapp";
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(message);
  }
  return "copied";
}
