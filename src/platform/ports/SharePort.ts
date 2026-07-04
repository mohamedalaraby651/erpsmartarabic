export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
}
export interface SharePort {
  share(payload: SharePayload): Promise<void>;
}
