export interface StoragePort {
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T): void;
  remove(key: string): void;
  keys(): string[];
  clear(): void;
}
