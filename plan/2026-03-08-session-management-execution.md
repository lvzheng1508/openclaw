# Session Management Execution

## Scope

- Fork-only implementation for the OpenClaw Control UI.
- Multi-agent browsing in UI.
- Local runtime transcript management only.
- Minimize churn in existing chat and session code.
- Keep runtime path handling non-hardcoded.

## Execution order

1. Add the repo-local `plan/` folder and this execution document.
2. Add new tab shells for `sessionManagement` and `historySession`.
3. Add protocol/types and backend list/get/import/export/reindex support.
4. Build the history list page.
5. Build the read-only history page.
6. Wire switch-to-chat behavior.
7. Add import/export conflict handling and rebuild-index UX.
8. Add tests and run verification.

## Checkpoints

### Checkpoint 1

- `plan/` scaffolding exists.
- New tabs/routes render without breaking existing navigation.
- Empty session-management and history pages can load.

### Checkpoint 2

- Backend RPCs return session-history data for a selected agent.
- UI list supports sorting, date filtering, paging, and selection.
- History detail view is read-only.

### Checkpoint 3

- Import/export work through File System Access API.
- Conflict prompts support `skip` and `overwrite`.
- Switching a session opens `聊天` with the selected session active.
- Tests and verification pass.

## Constraints

- Do not edit the approved attached plan file.
- Do not hardcode `~/.openclaw`; resolve runtime paths through shared helpers.
- Do not mutate transcript content directly as if it were a writable chat surface.
- Keep the existing `sessions.list` admin page behavior intact.
