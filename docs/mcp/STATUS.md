# MCP program status

**Status:** ⏸ paused until UX-3A Wave 10.

The three shipped MCP tools (`list-customers`, `list-recent-invoices`,
`search-products`) remain operational. No new tools, no Foundation work
(registry, policy, telemetry, cache, W0 contracts), no additional Edge
Functions until Wave 10.

## Why

Per **ADR-0027** (UX-3A Roadmap Freeze), the frontend platform is the
critical path. MCP is a downstream consumer of the read layer; wiring
tools before the read layer stabilizes multiplies churn.

## When we resume

Wave 10 executes the plan already reviewed and revised across
Waves W0 – W3.5 (Foundation → read tools → simulation tools → write
tools). That plan is preserved in prior chat history and will be
re-issued as its own `plan--create` at Wave 10 start.

## What is protected in the meantime

- `src/lib/mcp/**` — no changes.
- `.lovable/mcp/manifest.json` — no changes.
- `supabase/functions/mcp/**` — no changes.
- `src/pages/OAuthConsent.tsx` — no changes.

Any PR touching the above must reference an approved MCP-wave ADR.
