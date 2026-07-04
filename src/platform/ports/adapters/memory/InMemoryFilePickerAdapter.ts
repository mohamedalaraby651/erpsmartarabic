import type { FilePickerPort, FilePickerOptions, PickedFile } from "../../FilePickerPort";

export class InMemoryFilePickerAdapter implements FilePickerPort {
  private queue: PickedFile[][] = [];
  readonly calls: FilePickerOptions[] = [];
  enqueue(files: PickedFile[]): void { this.queue.push(files); }
  async pick(options: FilePickerOptions = {}): Promise<PickedFile[]> {
    this.calls.push(options);
    return this.queue.shift() ?? [];
  }
}
