import type { ClipboardPort } from "../../ClipboardPort";

export class BrowserClipboardAdapter implements ClipboardPort {
  async writeText(text: string): Promise<void> {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  }
  async readText(): Promise<string> {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      return navigator.clipboard.readText();
    }
    return "";
  }
}
