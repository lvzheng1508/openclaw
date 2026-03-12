# Claude Skills Integration Execution

## Scope

- Load skills from `~/.claude/skills` (Claude Code compatible directory) in addition to existing OpenClaw skill dirs.
- Watch `~/.claude/skills` for file changes so refresh picks up edits.
- Keep skill precedence explicit: Claude dir has lowest precedence (overridden by extra, bundled, managed, agents-skills-personal, agents-skills-project, workspace).
- Add snapshot logging for built skills (workspace dir, count, name/source/path) to aid debugging.
- Lockfile only: pnpm-lock.yaml updates from install (vitest/lancedb/tough-cookie resolution); no new dependencies.

## Execution order

1. Add the repo-local execution document under `plan/`.
2. In `src/agents/skills/refresh.ts`: add `~/.claude/skills` to `resolveWatchPaths` so skills refresh watches that directory.
3. In `src/agents/skills/workspace.ts`: load skills from `~/.claude/skills` with source `openclaw-extra`, merge with lowest precedence, and add `buildWorkspaceSkillSnapshot` info logging (workspaceDir, skillCount, skills name/source/path).
4. Commit and push (branch `dev_20260311`); update lockfile as needed from `pnpm install`.

## Checkpoints

### Checkpoint 1

- `plan/2026-03-12-claude-skills-execution.md` exists.
- `resolveWatchPaths` includes `path.join(os.homedir(), ".claude", "skills")`.
- Skills from `~/.claude/skills` are loaded and appear in merged set with source `openclaw-extra`.

### Checkpoint 2

- Precedence comment and merge order: `claude < extra < bundled < managed < agents-skills-personal < agents-skills-project < workspace`.
- `buildWorkspaceSkillSnapshot` logs at info level: workspaceDir, skillCount, and per-skill name, source, path.
- Lockfile changes (if any) are from dependency resolution only; no new root or agent deps.

### Checkpoint 3

- Single commit pushed to `origin/dev_20260311`.
- No hardcoded paths other than `~/.claude/skills` (standard Claude Code location); runtime paths use `os.homedir()`.

## Constraints

- Do not edit the approved plan file after creation except to fix typos or add a "Done" section.
- Do not add new npm dependencies; lockfile updates only.
- Keep existing skill load order and precedence semantics; Claude dir is additive with lowest precedence.
