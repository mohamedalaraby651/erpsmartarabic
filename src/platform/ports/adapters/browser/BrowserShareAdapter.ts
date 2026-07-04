import type { SharePort, SharePayload } from "../../SharePort";

export class BrowserShareAdapter implements SharePort {
  async share(p: SharePayload): Promise<void> {
    if (typeof navigator !== "undefined" && typeof (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share === "function") {
      await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(p);
      return;
    }
    // Fallback: copy URL to clipboard.
    if (typeof navigator !== "undefined" && navigator.clipboard && p.url) {
      await navigator.clipboard.writeText(p.url);
    }
  }
}
