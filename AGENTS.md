# Architecture rules

- Financial exception requests are written and resolved through tenant-scoped database RPCs; browser writes cannot confer approval or reopen periods, preventing bypass and duplicate consumption.
- Financial approval presentation consumes repositories through query hooks, preserving the existing UI/Contract/Query/Repository boundary without new runtime dependencies.
- Shared WorkspaceTable renders page-owned column contracts and persisted layouts only; it never queries, filters or grants actions, keeping table modernization independent of financial authority.
- Document form experience composes the existing form lifecycle and tenant/user-scoped local drafts; local persistence never represents an approved financial operation.
- Workspace Excel exports reuse the installed spreadsheet package and page-selected column contracts, preserving numerical values without a new runtime dependency.