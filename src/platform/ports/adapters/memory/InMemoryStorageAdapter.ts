import type { StoragePort } from "../../StoragePort";

export class InMemoryStorageAdapter implements StoragePort {
  private readonly map = new Map<string, string>();
  get<T = unknown>(key: string): T | undefined {
    const raw = this.map.get(key);
    if (raw == null) return undefined;
    try { return JSON.parse(raw) as T; } catch { return undefined; }
  }
  set<T = unknown>(key: string, value: T): void { this.map.set(key, JSON.stringify(value)); }
  remove(key: string): void { this.map.delete(key); }
  clear(): void { this.map.clear(); }
  keys(): string[] { return Array.from(this.map.keys()); }
}
