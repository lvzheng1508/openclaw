# SOP：从上游 openclaw/openclaw 更新到本地可构建状态

适用范围：已将官方仓库配置为 `upstream`（`https://github.com/openclaw/openclaw.git`），在**当前检出分支**上同步 `main` 并完成依赖安装与构建。

**本 SOP 不包含**：新建分支、推送到个人 fork、删除分支等 Git 协作步骤。

---

## 1. 前置检查

- 工作区建议干净；若有仅本地需要的改动，先 `git stash`（含未跟踪文件时用 `git stash -u`）。
- 确认远程存在：

  ```bash
  git remote -v
  # 应能看到 upstream -> https://github.com/openclaw/openclaw.git
  ```

  若缺失：

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

合并完成后可通过后续 **`pnpm build`** 重新生成 bundle 与相关产物。

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

  建议在依赖装全、与 CI 对齐后再本地跑一次 `pnpm check` 或等价校验，避免把真实问题带进分支。

---

## 5. 安装依赖

在仓库根目录：

```bash
pnpm install
```

（工作区含 `ui/`、`extensions/*`、`packages/*` 等，由根 `pnpm-workspace.yaml` 统一安装。）

---

## 6. 全量构建（含 Canvas A2UI）

```bash
pnpm build
```

对应 `scripts/build-all.mjs` 的 **full** 流程，主要包括：

- `canvas:a2ui:bundle`：打 A2UI bundle；
- `tsdown`、runtime postbuild、plugin-sdk dts 与导出检查；
- `canvas-a2ui-copy` 及 hook / 模板 / CLI 元数据等写盘步骤。

---

## 7. 控制面板 UI 构建

```bash
pnpm ui:build
```

在 `ui/` 下执行 Vite 生产构建，产物输出到 **`dist/control-ui/`**。

---

## 8. 构建后工作区清理（可选）

若仅为了验证能编过，**不需要**把纯本地构建产生的差异推远端，可对已跟踪但仅因本地构建而变化的文件执行还原（以 `git status` 为准），例如：

```bash
git restore src/canvas-host/a2ui/.bundle.hash
git restore vendor/a2ui/renderers/angular/package-lock.json vendor/a2ui/renderers/lit/package-lock.json
```

具体路径以后续 `git status` 列出为准。

---

## 9. 验收清单（最小）

- [ ] `git merge` 已完成且无未解决冲突。
- [ ] `pnpm install` 成功。
- [ ] `pnpm build` 成功（含 A2UI bundle 与 `canvas-a2ui-copy`）。
- [ ] `pnpm ui:build` 成功，`dist/control-ui/` 有产物。

---

## 参考命令速览

```bash
git fetch upstream && git merge upstream/main
# 若被生成物阻挡：rm -f src/canvas-host/a2ui/.bundle.hash src/canvas-host/a2ui/a2ui.bundle.js 后重试 merge
pnpm install && pnpm build && pnpm ui:build
```
