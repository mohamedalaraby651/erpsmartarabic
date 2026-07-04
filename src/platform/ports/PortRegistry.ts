/**
 * PortRegistry — single injection surface for Frontend Ports (ADR-0023).
 * Ports must NEVER import from ./adapters/**; adapters import their port
 * interface only.
 */
import type { NotificationPort } from "./NotificationPort";
import type { DialogPort } from "./DialogPort";
import type { NavigationPort } from "./NavigationPort";
import type { StoragePort } from "./StoragePort";
import type { ClipboardPort } from "./ClipboardPort";
import type { FilePickerPort } from "./FilePickerPort";
import type { SharePort } from "./SharePort";

import { BrowserNotificationAdapter } from "./adapters/browser/BrowserNotificationAdapter";
import { BrowserDialogAdapter } from "./adapters/browser/BrowserDialogAdapter";
import { BrowserNavigationAdapter } from "./adapters/browser/BrowserNavigationAdapter";
import { BrowserStorageAdapter } from "./adapters/browser/BrowserStorageAdapter";
import { BrowserClipboardAdapter } from "./adapters/browser/BrowserClipboardAdapter";
import { BrowserFilePickerAdapter } from "./adapters/browser/BrowserFilePickerAdapter";
import { BrowserShareAdapter } from "./adapters/browser/BrowserShareAdapter";

import { InMemoryNotificationAdapter } from "./adapters/memory/InMemoryNotificationAdapter";
import { InMemoryDialogAdapter } from "./adapters/memory/InMemoryDialogAdapter";
import { InMemoryNavigationAdapter } from "./adapters/memory/InMemoryNavigationAdapter";
import { InMemoryStorageAdapter } from "./adapters/memory/InMemoryStorageAdapter";
import { InMemoryClipboardAdapter } from "./adapters/memory/InMemoryClipboardAdapter";
import { InMemoryFilePickerAdapter } from "./adapters/memory/InMemoryFilePickerAdapter";
import { InMemoryShareAdapter } from "./adapters/memory/InMemoryShareAdapter";

/**
 * Authoritative list of every declared Frontend Port. Consumed by
 * `check-port-registry-completeness.mjs` and `check-port-adapter-parity.mjs`.
 */
export const DECLARED_PORTS = [
  "notification",
  "dialog",
  "navigation",
  "storage",
  "clipboard",
  "filePicker",
  "share",
] as const;

export type PortName = (typeof DECLARED_PORTS)[number];

export interface PortMap {
  notification: NotificationPort;
  dialog: DialogPort;
  navigation: NavigationPort;
  storage: StoragePort;
  clipboard: ClipboardPort;
  filePicker: FilePickerPort;
  share: SharePort;
}

export class PortRegistry {
  private constructor(private readonly map: PortMap) {}

  get<K extends PortName>(name: K): PortMap[K] {
    return this.map[name];
  }

  has(name: PortName): boolean {
    return name in this.map;
  }

  names(): readonly PortName[] {
    return DECLARED_PORTS;
  }

  /** Default (browser) adapters. Constructed lazily via `PlatformShell`. */
  static default(overrides: Partial<PortMap> = {}): PortRegistry {
    return new PortRegistry({
      notification: new BrowserNotificationAdapter(),
      dialog: new BrowserDialogAdapter(),
      navigation: new BrowserNavigationAdapter(),
      storage: new BrowserStorageAdapter(),
      clipboard: new BrowserClipboardAdapter(),
      filePicker: new BrowserFilePickerAdapter(),
      share: new BrowserShareAdapter(),
      ...overrides,
    });
  }

  /** In-memory adapters for tests and headless runtimes. */
  static inMemory(overrides: Partial<PortMap> = {}): PortRegistry {
    return new PortRegistry({
      notification: new InMemoryNotificationAdapter(),
      dialog: new InMemoryDialogAdapter(),
      navigation: new InMemoryNavigationAdapter(),
      storage: new InMemoryStorageAdapter(),
      clipboard: new InMemoryClipboardAdapter(),
      filePicker: new InMemoryFilePickerAdapter(),
      share: new InMemoryShareAdapter(),
      ...overrides,
    });
  }
}
