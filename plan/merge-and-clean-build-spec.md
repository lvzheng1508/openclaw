# 合并与彻底构建执行规范

## 执行步骤

1. 拉取上游主干：
   - `git fetch upstream main`
2. 合并并强制解决冲突（主干优先）：
   - `git merge upstream/main`
   - 若有冲突，记录列表：`git diff --name-only --diff-filter=U`
   - 对冲突文件采用主干版本：`git checkout --theirs -- <file>`
   - 完成提交，并在日志中记录冲突文件清单。

## 彻底构建验证（必做）

合并完成后执行一次完整干净构建：

1. 清理构建产物：
   - `rm -rf dist ui/dist`
2. 按锁文件重装依赖：
   - `pnpm install --frozen-lockfile`
3. 构建主工程与 UI（顺序固定）：
   - `pnpm build`（`tsdown` 默认会清空整个 `dist/`，若先跑 `ui:build` 会被删掉）
   - `pnpm ui:build`
4. 代码质量检查：
   - `pnpm check`

只有上述步骤全部通过，才视为本次验证完成。
