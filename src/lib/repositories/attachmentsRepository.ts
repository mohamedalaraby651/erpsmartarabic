/**
 * Attachments Repository — minimal surface used by shared AttachmentsList.
 * (Upload pipeline still lives in dedicated services; this only owns row CRUD.)
 */
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "./_base";

export const attachmentsRepository = {
  async deleteById(id: string): Promise<void> {
    await unwrap(supabase.from("attachments").delete().eq("id", id));
  },
};
