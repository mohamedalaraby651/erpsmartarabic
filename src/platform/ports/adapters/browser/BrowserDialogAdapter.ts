import type { DialogPort, DialogRequest, DialogResult } from "../../DialogPort";

/**
 * Thin browser dialog adapter. Wave 1 fallback uses window.confirm.
 * Wave 2 will replace with the shadcn AlertDialog wrapper.
 */
export class BrowserDialogAdapter implements DialogPort {
  async confirm(req: DialogRequest): Promise<DialogResult> {
    if (typeof window === "undefined" || typeof window.confirm !== "function") {
      return "cancelled";
    }
    const msg = req.description ? `${req.title}\n\n${req.description}` : req.title;
    return window.confirm(msg) ? "confirmed" : "cancelled";
  }
}
