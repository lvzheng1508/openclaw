# Workspace memory files: dynamic creation

## 修改目的

- **问题**：Agent 在按 AGENTS.md 的「Session Startup」等段落执行「Read memory/YYYY-MM-DD.md」或读取 `MEMORY.md` 时，若这些文件尚未存在，会触发 **read 工具 ENOENT**，日志出现 `[tools] read failed: ENOENT: no such file or directory, access '.../MEMORY.md'` 或 `.../workspace/memory/2026-03-09.md` 等。
- **期望**：`MEMORY.md` 与按日期命名的 `memory/YYYY-MM-DD.md` 应在**需要时由系统动态创建**，而不是依赖用户事先手动创建；尤其是 `memory/2026-03-09.md`、`memory/2026-03-08.md` 这类按日期的文件。

## 修改范围与位置

- **文件**：`src/auto-reply/reply/post-compaction-context.ts`
- **时机**：在 **post-compaction 注入** 时，会把 AGENTS.md 中「Session Startup」「Red Lines」等段落里的 `YYYY-MM-DD` 替换为当天/昨天日期，并注入到会话；模型随后可能调用 read 读取 `MEMORY.md` 或 `memory/YYYY-MM-DD.md`。因此在该注入**之前**先确保这些路径存在。

## 实现要点

1. **新增辅助函数** `ensureMemoryFilesForContext(workspaceDir, dateStamp, yesterdayStamp)`：
   - 若不存在则创建根目录下的 **`MEMORY.md`**（空文件）；
   - 若不存在则创建 **`memory/`** 目录；
   - 若不存在则创建 **`memory/<dateStamp>.md`**（当天）和 **`memory/<yesterdayStamp>.md`**（昨天），均为空文件；
   - 使用 `flag: "wx"` 写文件，避免覆盖已有内容。

2. **调用时机**：在 `readPostCompactionContext()` 内，在完成从 AGENTS.md 抽取段落、计算 `dateStamp` 与 `yesterdayStamp`（基于用户时区）之后，在拼接并返回注入内容之前，调用 `await ensureMemoryFilesForContext(workspaceDir, dateStamp, yesterdayStamp)`。

3. **日期计算**：当天与昨天均通过已有的 `formatDateStamp(nowMs, timezone)` 得到，与注入文本中的 `YYYY-MM-DD` 替换一致，保证模型读到的路径与磁盘上的文件名一致。

## 结果与验证

- 发生 post-compaction 并注入含「Read memory/YYYY-MM-DD.md」的上下文时，对应日期的 `memory/YYYY-MM-DD.md` 以及 `MEMORY.md`、`memory/` 会在注入前被按需创建，read 工具不再因文件不存在而 ENOENT。
- 已有测试：`src/auto-reply/reply/post-compaction-context.test.ts` 全部通过（24 tests）。

## 相关说明

- 仅在有 **post-compaction 上下文注入** 的流程中创建这些文件；若未来在「首次会话启动」等路径也会让模型读取 `MEMORY.md` 或 `memory/YYYY-MM-DD.md`，可考虑在对应路径同样调用类似的 ensure 逻辑。
- 文档约定：`MEMORY.md` 为可选、不强制自动创建；本次为消除 read ENOENT，在注入会引用到这些路径时自动创建空文件，与「when present, it is loaded」的语义兼容。
