export interface NavigationTarget {
  path: string;
  replace?: boolean;
  state?: unknown;
}
export interface NavigationPort {
  navigate(target: NavigationTarget): void;
  back(): void;
  current(): string;
}
