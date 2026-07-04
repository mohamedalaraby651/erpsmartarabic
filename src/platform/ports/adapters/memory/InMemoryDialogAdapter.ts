import type { DialogPort, DialogRequest, DialogResult } from "../../DialogPort";

export class InMemoryDialogAdapter implements DialogPort {
  readonly requests: DialogRequest[] = [];
  private queue: DialogResult[] = [];
  enqueue(...results: DialogResult[]): void { this.queue.push(...results); }
  async confirm(req: DialogRequest): Promise<DialogResult> {
    this.requests.push(req);
    return this.queue.shift() ?? "cancelled";
  }
}
