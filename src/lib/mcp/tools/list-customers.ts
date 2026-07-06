import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_customers",
  title: "List customers",
  description: "List customers visible to the signed-in user (scoped by tenant RLS). Optionally filter by name/phone/email.",
  inputSchema: {
    search: z.string().trim().optional().describe("Optional fuzzy search across name, phone, and email."),
    limit: z.number().int().min(1).max(100).default(25).describe("Max rows to return (1-100)."),
    only_active: z.boolean().default(true).describe("Return only active customers when true."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit, only_active }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("customers")
      .select("id,name,phone,email,city,current_balance,credit_limit,is_active,last_transaction_date")
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (only_active) q = q.eq("is_active", true);
    if (search && search.length > 0) {
      const s = `%${search}%`;
      q = q.or(`name.ilike.${s},phone.ilike.${s},email.ilike.${s}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { customers: data ?? [] },
    };
  },
});
