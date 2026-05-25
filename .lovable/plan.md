## Wire Sales & Procurement into the v2 PDF Engine

### Findings (current state)

- `InvoicePrintView` and `QuotationPrintView` already call `routePdfRequest`, but **omit** `tenantId` → `resolvePdfConfig` is skipped and the active `DocumentRenderProfile` (logo, watermark, margins) never reaches the renderer.
- The form dialogs (`InvoiceFormDialog`, `QuotationFormDialog`, `QuoteNewPage`) have **no Print/PDF button at all** today.
- `HtmlPdfEngine` already auto-switches to `renderChunkedHtmlPdf` at ≥ 50 rows — but **only when the primary** `<table>` **carries** `data-pdf-chunk` **or** `class="pdf-table"`. None of the v2 templates (`InvoiceHtmlTemplate`, `QuotationHtmlTemplate`, `StatementHtmlTemplate`, `PurchaseOrderHtmlTemplate`) currently do, so chunking never fires in production.
- `LivePreviewPanel` already binds to `usePdfProfile` (which itself subscribes via `usePdfProfileRealtime`); reusing it inside the form wizards immediately delivers cross-tab live refresh.

---

### Phase 1 — Wire Print/Export buttons through `routePdfRequest`

**1a. Pass** `tenantId` **from the print views** so the profile resolver runs.

- `src/components/print/InvoicePrintView.tsx`: read `tenantId` from `useTenant()` and pass it in the `routePdfRequest({ tenantId, … })` call. Same for `QuotationPrintView.tsx`.
- This single change activates branding/watermark/margins from `DocumentRenderProfile` for every existing Print dialog.

**1b. Add a "Print PDF" action to the form dialogs** (after a successful save).

- `InvoiceFormDialog.tsx`: when `mutation.onSuccess` returns the new `invoiceId`, surface a secondary `Button` ("طباعة PDF") in the footer that opens `InvoicePrintView` for that id. Skip when the dialog is still dirty/unsaved to guarantee we only ever print the validated DB record.
- `QuotationFormDialog.tsx` + `QuoteNewPage.tsx`: same pattern, opening `QuotationPrintView`.
- Rationale: keeps the heavy fetch + template path in one place (`*PrintView`) and guarantees the printed payload comes from the DB row with the rounded `subtotal / discount_amount / tax_amount / total_amount` (Phase 3 of the previous hotfix) — not the in-memory form state.

### Phase 2 — Activate chunked rendering on real documents

**2a. Tag the primary items table in each v2 template with** `data-pdf-chunk` so `pickPrimaryTable` finds it:

- `InvoiceHtmlTemplate.ts` → `<table class="items" data-pdf-chunk>`
- `QuotationHtmlTemplate.ts` → `<table class="items" data-pdf-chunk>`
- `PurchaseOrderHtmlTemplate.ts` → same
- `StatementHtmlTemplate.ts` → tag `<table class="txns" data-pdf-chunk>` (the transactions table — the aging summary stays single-pass)

That alone makes `HtmlPdfEngine` auto-switch to `renderChunkedHtmlPdf` at the existing ≥ 50-row threshold; the header/footer/watermark are preserved on every page because the chunked path clones the whole container shell (`chunkedRender.ts` lines 201–225).

**2b. Update template tests** (`InvoiceHtmlTemplate.test.ts`, etc.) so the attribute presence is asserted — guards against regression.

**2c. No code path change in** `HtmlPdfEngine` — chunked rendering is already integrated and tested (`chunkedRender.test.ts`).

### Phase 3 — Live preview inside the creation wizards

**3a. New light wrapper hook** `src/components/settings/ExportCenter/useLivePreviewProfile.ts` — re-exports `usePdfProfile()` (which already mounts `usePdfProfileRealtime`) so wizard consumers don't need to know about the realtime detail.

**3b. Mount** `<LivePreviewPanel profile={profile} />` **inside:**

- `QuotationFormDialog` Step 3 (the totals step) — desktop only (`hidden lg:block`), height 420, behind an existing `AdaptiveContainer` guard so mobile stays uncluttered.
- `QuoteNewPage` — beside the totals card in the right column on `lg:` breakpoints.
- `InvoiceFormDialog` Step 3 — same pattern as the quotation dialog.

Because `usePdfProfile` already invokes `usePdfProfileRealtime`, a margin/branding tweak made by an admin in another tab will refresh the preview without manual reload — no extra subscription needed here.

### Phase 4 — Verification

- `bunx vitest run` — must remain at the 1150-passing baseline.
- Update affected template tests to assert `data-pdf-chunk` is present.
- Add one targeted test in `routePdfRequest.test.ts`-adjacent or `InvoicePrintView` integration: when a 60-item invoice is rendered, `shouldChunk` returns `true` for the produced container. (Pure DOM assertion, no real PDF render.)
- Manual preview smoke: open `/invoices`, hit "طباعة" on a 60-line invoice, confirm download + watermark.

### Out of scope (call out, do not build)

- A separate "Print" entry directly inside the unsaved form (we explicitly route through the saved-DB-row path to guarantee Phase-3 financial integrity from the previous hotfix).
- Migrating `*PrintView` away from `PrintTemplate` to the v2 templates entirely — that's a Wave D rewrite.

Act as a Principal Full-Stack Engineer and UI/UX Architect. We need to execute the integration phase to wire our Sales & Procurement modules into our premium v2 PDF Generation Engine based on our architectural findings. 

&nbsp;

Please safely implement the following updates without breaking our 1150-passing test baseline:

&nbsp;

Phase 1 — Wire Print/Export Buttons through routePdfRequest

1. Resolve Profile Skipping: In `src/components/print/InvoicePrintView.tsx` and `src/components/print/QuotationPrintView.tsx`, read the `tenantId` from our `useTenant()` hook and pass it directly inside the `routePdfRequest({ tenantId, ... })` invocation. This ensures `resolvePdfConfig` triggers and loads the custom branding, logo, margins, and watermarks correctly.

2. Post-Save Printing Actions: 

   - In `InvoiceFormDialog.tsx`, upon a successful save mutation (returning the new `invoiceId`), surface a secondary "طباعة PDF" (Print PDF) button in the footer that safely triggers the `InvoicePrintView` for that validated ID. Disable or hide this button if the form is dirty/unsaved.

   - Apply the exact same safe post-save pattern inside `QuotationFormDialog.tsx` and `QuoteNewPage.tsx` to ensure we only print verified database rows with rounded financial figures.

&nbsp;

Phase 2 — Activate Chunked Rendering on Real Documents

1. Tag Primary Tables: Update our v2 HTML templates to ensure the primary tabular components carry the `data-pdf-chunk` attribute so `pickPrimaryTable` can catch them:

   - `InvoiceHtmlTemplate.ts` -> Add `data-pdf-chunk` to `<table class="items" ...>`

   - `QuotationHtmlTemplate.ts` -> Add `data-pdf-chunk` to `<table class="items" ...>`

   - `PurchaseOrderHtmlTemplate.ts` -> Add `data-pdf-chunk` to `<table class="items" ...>`

   - `StatementHtmlTemplate.ts` -> Add `data-pdf-chunk` to the main transactions table `<table class="txns" ...>` (leaving aging summary single-pass).

2. Regression Guard: Update the template test suites (`InvoiceHtmlTemplate.test.ts`, etc.) to assert the presence of the `data-pdf-chunk` attribute.

&nbsp;

Phase 3 — Live Preview Inside Creation Wizards

1. Lightweight Preview Hook: Create a wrapper hook `src/components/settings/ExportCenter/useLivePreviewProfile.ts` that safely re-exports `usePdfProfile()` (which already triggers the realtime synchronization hook `usePdfProfileRealtime`).

2. Embed LivePreviewPanel: Mount `<LivePreviewPanel profile={profile} />` inside:

   - `QuotationFormDialog` Step 3 (Totals Step) -> Restricted to desktop screens (`hidden lg:block`), height 420, wrapped inside our `AdaptiveContainer` guard.

   - `InvoiceFormDialog` Step 3 -> Use the same pattern as the quotation dialog.

   - `QuoteNewPage.tsx` -> Place it adjacent to the totals card in the right column on `lg` breakpoints.

&nbsp;

Phase 4 — Testing & Verification

- Run our targeted template and route tests via Vitest: Ensure all 1150 tests pass successfully.

- Add a DOM-level assertion test in `routePdfRequest.test.ts` (or adjacent) confirming that when a 60-line simulated document is processed, `shouldChunk` evaluates to true based on the 

container's layout markers.