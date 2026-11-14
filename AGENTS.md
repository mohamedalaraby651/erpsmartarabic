# Architecture rules

- Financial exception requests are written and resolved through tenant-scoped database RPCs; browser writes cannot confer approval or reopen periods, preventing bypass and duplicate consumption.
- Financial approval presentation consumes repositories through query hooks, preserving the existing UI/Contract/Query/Repository boundary without new runtime dependencies.