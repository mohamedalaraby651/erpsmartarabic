/**
 * Platform · ports — public sub-façade.
 * Ports MUST NOT import from ./adapters/**. See DEPENDENCY_RULES.md §Ports.
 */
export type { NotificationPort, NotificationLevel, NotificationPayload } from "./NotificationPort";
export type { DialogPort, DialogRequest, DialogResult } from "./DialogPort";
export type { NavigationPort, NavigationTarget } from "./NavigationPort";
export type { StoragePort } from "./StoragePort";
export type { ClipboardPort } from "./ClipboardPort";
export type { FilePickerPort, FilePickerOptions, PickedFile } from "./FilePickerPort";
export type { SharePort, SharePayload } from "./SharePort";

export { PortRegistry, DECLARED_PORTS } from "./PortRegistry";
export type { PortName, PortMap } from "./PortRegistry";
