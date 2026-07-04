import type { NavigationPort, NavigationTarget } from "../../NavigationPort";

export class InMemoryNavigationAdapter implements NavigationPort {
  readonly history: string[] = ["/"];
  navigate(t: NavigationTarget): void {
    if (t.replace) this.history[this.history.length - 1] = t.path;
    else this.history.push(t.path);
  }
  back(): void { if (this.history.length > 1) this.history.pop(); }
  current(): string { return this.history[this.history.length - 1] ?? "/"; }
}
