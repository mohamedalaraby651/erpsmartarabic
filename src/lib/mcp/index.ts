import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCustomers from "./tools/list-customers";
import listRecentInvoices from "./tools/list-recent-invoices";
import searchProducts from "./tools/search-products";

// The OAuth issuer MUST be the direct Supabase host, built from the project ref
// (VITE_SUPABASE_PROJECT_ID is inlined at build time by Vite, so this stays
// import-safe). Never derive it from SUPABASE_URL — the Cloud proxy host would
// mismatch the issuer that Supabase Auth publishes and every token would be
// rejected. The fallback keeps the string well-formed during manifest extract.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nazra-erp-mcp",
  title: "Nazra ERP",
  version: "0.1.0",
  instructions:
    "Tools for the Nazra ERP workspace. Use `list_customers` to find customers, `search_products` to look up items in the catalog, and `list_recent_invoices` to review recent sales invoices. All results are scoped to the signed-in user's tenant.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCustomers, searchProducts, listRecentInvoices],
});
