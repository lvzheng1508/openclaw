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

## 7. 运行验证模式 (本地运行)

如果需要立即运行最新的代码，可以根据需求选择不同的构建/运行方式：

### A. 快速验证模式 (推荐，直接运行源码)

直接运行 `src/` 下的 TS 源码，**完全跳过后端编译步骤**，能确保运行的是最新代码且避开 `dist/` 缓存干扰。

```bash
pnpm install
pnpm ui:build      # 必须执行一次，UI 是静态服务
pnpm openclaw gateway --verbose
```

### B. 最小化运行时构建 (快速)

仅构建 Gateway 运行必须的核心产物，比全量 build 快很多：

```bash
node scripts/build-all.mjs gatewayWatch
pnpm ui:build
```

### C. 全量生产构建 (耗时)

```bash
pnpm build
pnpm ui:build
```

> [!TIP]
> 若怀疑有残留缓存，可执行 `rm -rf dist/` 彻底清理旧产物后再构建。

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

**日常同步更新 (在主力开发机上执行)：**

```bash
git fetch upstream && git merge upstream/main
# 若冲突：rm -f src/canvas-host/a2ui/.bundle.hash src/canvas-host/a2ui/a2ui.bundle.js 然后 merge
pnpm install
git push origin main
```

**在其他机器上更新 (仅拉取已同步的代码)：**

```bash
git pull origin main
pnpm install
```

**同步后最小构建 (推荐，适配 myclaw run)：**

```bash
# 仅构建后端核心 + UI，避开全量 build 的耗时
node scripts/build-all.mjs gatewayWatch && pnpm ui:build
# 之后即可正常使用：
myclaw run
```

**本地全量构建 (仅在需要发布或排查底层问题时执行)：**

```bash
pnpm build && pnpm ui:build
```
