# SOP：从上游 openclaw/openclaw 同步到个人 Fork

适用范围：已将官方仓库配置为 `upstream`（`https://github.com/openclaw/openclaw.git`），在**当前检出分支**上同步 `main` 并更新依赖，最终推送到个人的 Fork 仓库。

---

## 1. 前置检查

- 工作区建议干净；若有仅本地需要的改动，先 `git stash`（含未跟踪文件时用 `git stash -u`）。
- 确认远程存在：

  ```bash
  git remote -v
  # 应能看到 upstream -> https://github.com/openclaw/openclaw.git
  # 以及 origin -> https://github.com/<你的用户名>/openclaw.git
  ```

  若缺失 upstream：

  ```bash
  git remote add upstream https://github.com/openclaw/openclaw.git
  ```

---

## 2. 拉取上游并合并

```bash
git fetch upstream
git merge upstream/main
```

- 默认主干分支名为 **`main`**（与 `upstream/HEAD` 一致）。若你使用其他跟踪分支，将 `upstream/main` 换成对应 ref。

---

## 3. 合并被本地文件阻挡时

若提示 **untracked / 将被覆盖**，常见是 Canvas A2UI 的本地生成物（例如 `src/canvas-host/a2ui/.bundle.hash`、`src/canvas-host/a2ui/a2ui.bundle.js`）。它们可能被 `.gitignore` 忽略，`stash` 默认带不走，需要先删除再合并：

```bash
rm -f src/canvas-host/a2ui/.bundle.hash src/canvas-host/a2ui/a2ui.bundle.js
git merge upstream/main
```

---

## 4. 解决冲突

- 按文件处理冲突标记（`<<<<<<<` / `=======` / `>>>>>>>`），完成后：

  ```bash
  git add <已解决文件>
  git commit
  ```

- **Pre-commit 失败**：根目录合并提交可能触发 hook（如 oxlint / TypeScript ESLint）。若确认仅为本地工具链与上游不一致导致的误报，可用：

  ```bash
  git commit --no-verify
  ```

---

## 5. 安装依赖（轻量，保持开发树最新）

在仓库根目录执行，确保本地依赖状态与代码匹配：

```bash
pnpm install
```

（工作区含 `ui/`、`extensions/*`、`packages/*` 等，由根 `pnpm-workspace.yaml` 统一安装。）

---

## 6. 推送至个人 Fork（完成同步）

代码合并并解决冲突后，将其推送到你的 origin：

```bash
git push origin main
```

> **至此，Fork 代码更新已完成。若无需在本地运行或调试，后续步骤均可跳过。**

---

## 7. 全量构建与 UI 构建（可选，仅需验证或运行时执行）

若仅为更新代码，**可完全跳过此步**。全量构建较为耗时：

```bash
pnpm build
pnpm ui:build
```

- `pnpm build`：对应 `scripts/build-all.mjs` 的 **full** 流程，包括打 A2UI bundle、tsdown、runtime postbuild 等。
- `pnpm ui:build`：在 `ui/` 下执行 Vite 生产构建，产物输出到 `dist/control-ui/`。

---

## 8. 构建后工作区清理（可选）

若执行了可选的构建且仅为了验证能编过，**不需要**把纯本地构建产生的差异推远端，可对已跟踪但仅因本地构建而变化的文件执行还原：

```bash
git restore src/canvas-host/a2ui/.bundle.hash
git restore vendor/a2ui/renderers/angular/package-lock.json vendor/a2ui/renderers/lit/package-lock.json
```

具体路径以后续 `git status` 列出为准。

---

## 9. 验收清单（最小同步）

- [ ] `git merge` 已完成且无未解决冲突。
- [ ] `pnpm install` 成功（确保依赖树最新）。
- [ ] `git push origin main` 成功。

---

## 参考命令速览

**日常同步更新（推荐）：**

```bash
git fetch upstream && git merge upstream/main
# 若被生成物阻挡：rm -f src/canvas-host/a2ui/.bundle.hash src/canvas-host/a2ui/a2ui.bundle.js 后重试 merge
pnpm install
git push origin main
```

**本地运行所需的构建（按需执行）：**

```bash
pnpm build && pnpm ui:build
```
