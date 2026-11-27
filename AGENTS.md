# Architecture rules

- Financial exception requests are written and resolved through tenant-scoped database RPCs; browser writes cannot confer approval or reopen periods, preventing bypass and duplicate consumption.
- Financial approval presentation consumes repositories through query hooks, preserving the existing UI/Contract/Query/Repository boundary without new runtime dependencies.
- Shared WorkspaceTable renders page-owned column contracts and persisted layouts only; it never queries, filters or grants actions, keeping table modernization independent of financial authority.
- Document form experience composes the existing form lifecycle and tenant/user-scoped local drafts; local persistence never represents an approved financial operation.
- Logistics item editors are controlled by the document's line state; restoring or resetting a document must immediately update visible rows without a second local copy.
- Credit-note local drafts persist only header and item-selection intent; restoration and submission reload invoice references and quantities because stored values cannot establish return authority.
- Workspace Excel exports reuse the installed spreadsheet package and page-selected column contracts, preserving numerical values without a new runtime dependency.
- Journal dimension validation resolves every supplied reference within the server-derived tenant before writes and a database guard enforces the same rule on sibling write paths, preventing cross-company accounting links.
- Supplier payments and balance effects use one tenant-scoped database operation; browser callers never adjust supplier balances directly.
- Backup restore validates the full payload against database-derived approved fields, same-company references and existing ownership before snapshots or writes; database triggers block company reassignment.
- Bulk customer obligation validation derives the caller's tenant and checks delete permission inside the RPC before returning any records; execute grants alone must never expose cross-company obligations.
- Attachment preview/download resolves stored paths through the shared private-storage signing helper at action time; saved URLs are not permanent access authority.