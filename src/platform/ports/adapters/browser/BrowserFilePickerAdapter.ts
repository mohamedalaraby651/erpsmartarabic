import type { FilePickerPort, FilePickerOptions, PickedFile } from "../../FilePickerPort";

export class BrowserFilePickerAdapter implements FilePickerPort {
  async pick(options: FilePickerOptions = {}): Promise<PickedFile[]> {
    if (typeof document === "undefined") return [];
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      if (options.accept) input.accept = options.accept;
      if (options.multiple) input.multiple = true;
      input.style.position = "fixed";
      input.style.left = "-9999px";
      input.addEventListener("change", async () => {
        const files = Array.from(input.files ?? []);
        const out: PickedFile[] = [];
        for (const f of files) {
          const bytes = new Uint8Array(await f.arrayBuffer());
          out.push({ name: f.name, type: f.type, size: f.size, bytes });
        }
        input.remove();
        resolve(out);
      }, { once: true });
      document.body.appendChild(input);
      input.click();
    });
  }
}
