export interface FilePickerOptions {
  accept?: string;
  multiple?: boolean;
}
export interface PickedFile {
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
}
export interface FilePickerPort {
  pick(options?: FilePickerOptions): Promise<PickedFile[]>;
}
