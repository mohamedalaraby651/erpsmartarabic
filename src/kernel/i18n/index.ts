/**
 * Kernel · i18n — TranslationPort contract + in-memory adapter.
 */
export type Messages = Readonly<Record<string, string>>;

export interface TranslationPort {
  t(key: string, vars?: Record<string, string | number>): string;
  has(key: string): boolean;
  locale: string;
}

export class InMemoryTranslator implements TranslationPort {
  constructor(public readonly locale: string, private readonly messages: Messages) {}
  has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.messages, key);
  }
  t(key: string, vars?: Record<string, string | number>): string {
    const template = this.messages[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  }
}
