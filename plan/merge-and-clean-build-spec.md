# 合并与彻底构建执行规范

## 目标

- 将 `https://github.com/openclaw/openclaw` 的 `main` 合并到当前工作分支。
- 冲突处理以主干代码为准（`upstream/main`）。
- 合并后若出现错误，先修复代码问题，再继续验证。
- 完成一次彻底、干净的构建，尽早暴露集成问题。

## 前置条件

- 当前所在分支即目标分支（执行过程中不切换分支）。
- 工作区状态可追踪（不使用 stash）。
- 已配置上游远端（示例：`upstream -> https://github.com/openclaw/openclaw`）。

## 执行步骤

1. 拉取上游主干：
   - `git fetch upstream main`
2. 合并到当前分支：
   - `git merge upstream/main`
3. 无冲突：
   - 进入“合并后错误修复”和“彻底构建验证”。
4. 有冲突：
   - 按“冲突处理规则”执行。

## 冲突处理规则（主干优先）

- 规则：所有冲突统一采用 `upstream/main`（`theirs`）版本。
- 必须明确记录冲突文件清单：
  - `git diff --name-only --diff-filter=U`
- 处理流程：
  1. 先导出冲突文件列表。
  2. 对每个冲突文件采用主干版本并暂存：
     - `git checkout --theirs -- <file>`
     - `git add <file>`
  3. 完成合并提交：
     - `git commit`
- 合并记录要求：
  - 在合并说明中增加小节 `Conflicted files (resolved with upstream/main):`
  - 逐行列出每个冲突文件路径。

## 合并后错误修复

- 合并后若出现 TypeScript / lint / 运行时报错，先修复再构建。
- 修复说明需引用相关 `plan` 文档（按实际改动选择），例如：
  - `plan/2026-03-08-session-management-execution.md`
  - `plan/2026-03-09-workspace-memory-files-dynamic-create.md`
  - `plan/2026-03-12-claude-skills-execution.md`
- 修复范围只针对合并回归问题，避免顺带重构。

## 彻底构建验证（必做）

合并完成后执行一次完整干净构建：

1. 清理构建产物：
   - `rm -rf dist ui/dist`
2. 按锁文件重装依赖：
   - `pnpm install --frozen-lockfile`
3. 构建 UI 与主工程：
   - `pnpm ui:build`
   - `pnpm build`
4. 代码质量检查：
   - `pnpm check`

若任一步失败：

- 先修复当前失败项；
- 从失败步骤重新执行；
- 仅当所有必做步骤通过，才视为本次合并完成。

## 验收标准

- 已完成 `upstream/main` 到当前分支的合并。
- 若发生冲突，冲突文件清单已明确记录，且全部按主干版本处理。
- 合并后代码错误已修复，并在说明中引用对应 `plan` 文档。
- 彻底构建验证通过（`ui:build`、`build`、`check` 全部通过）。
