import type { StoragePort } from "../../StoragePort";

export class BrowserStorageAdapter implements StoragePort {
  private readonly ls: Storage | null;
  constructor(storage?: Storage) {
    this.ls = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  }
  get<T = unknown>(key: string): T | undefined {
    if (!this.ls) return undefined;
    const raw = this.ls.getItem(key);
    if (raw == null) return undefined;
    try { return JSON.parse(raw) as T; } catch { return undefined; }
  }
  set<T = unknown>(key: string, value: T): void {
    if (!this.ls) return;
    this.ls.setItem(key, JSON.stringify(value));
  }
  remove(key: string): void { this.ls?.removeItem(key); }
  clear(): void { this.ls?.clear(); }
  keys(): string[] {
    if (!this.ls) return [];
    const out: string[] = [];
    for (let i = 0; i < this.ls.length; i++) {
      const k = this.ls.key(i);
      if (k != null) out.push(k);
    }
    return out;
  }
}
