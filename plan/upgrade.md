# OpenClaw 同步指南

从官方仓库更新代码到个人 Fork，保留 `plan/` 个人笔记。

| 仓库 | 地址 | 用途 |
|------|------|------|
| upstream | https://github.com/openclaw/openclaw | 拉官方代码 |
| origin | https://github.com/lvzheng1508/openclaw | 推送到自己的 Fork |

---

## 一次性配置

```bash
git remote add upstream https://github.com/openclaw/openclaw.git   # 已配置可跳过
git remote -v
```

---

## 日常同步（推荐）

**只改 `plan/`，其余代码跟官方走。**

```bash
# 1. 拉官方最新代码并合并（不覆盖本地 commit 历史）
git fetch upstream
git merge upstream/main

# 2. 推送到 Fork
git push origin main
```

`plan/` 只在 Fork 里有，merge 不会动它。

---

## 合并冲突

不改业务代码，冲突一律用官方版本：

```bash
# 查看冲突文件（plan/ 除外）
git diff --name-only --diff-filter=U

# 单个文件用官方版本
git checkout --theirs <文件路径>
git add <文件路径>

# 完成合并
git commit
git push origin main
```

常见：`pnpm-lock.yaml` 冲突时 `git checkout --theirs pnpm-lock.yaml && git add pnpm-lock.yaml`

a2ui 合并被挡时：

```bash
rm -f src/canvas-host/a2ui/.bundle.hash src/canvas-host/a2ui/a2ui.bundle.js
git merge upstream/main
```

---

## 同步后构建

```bash
pnpm install
node scripts/build-all.mjs gatewayWatch && pnpm ui:build   # 日常最小构建
myclaw run
```

全量构建（依赖大改或构建报错时）：

```bash
pnpm build && pnpm ui:build
```

---

## 其他机器

主力机已 push 后：

```bash
git pull origin main
pnpm install
node scripts/build-all.mjs gatewayWatch && pnpm ui:build
myclaw run
```
