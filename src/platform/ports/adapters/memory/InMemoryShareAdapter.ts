import type { SharePort, SharePayload } from "../../SharePort";

export class InMemoryShareAdapter implements SharePort {
  readonly log: SharePayload[] = [];
  async share(p: SharePayload): Promise<void> { this.log.push(p); }
}
