import type { ClipboardPort } from "../../ClipboardPort";

export class InMemoryClipboardAdapter implements ClipboardPort {
  private buffer = "";
  async writeText(text: string): Promise<void> { this.buffer = text; }
  async readText(): Promise<string> { return this.buffer; }
}
