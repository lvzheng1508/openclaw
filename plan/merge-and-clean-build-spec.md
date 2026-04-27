# OpenClaw 同步与构建指南 (SOP)

本指南针对 `lvzheng` 的开发习惯定制，主要用于同步官方上游代码并确保 `myclaw run` 正常运行。

---

## 核心流程 1：上游同步 + 全量构建

**适用场景**：上游有重大更新（如底层依赖变动）、需要发布版本、或由于代码变动太大导致常规构建报错时。

```bash
# 1. 同步代码
git fetch upstream && git merge upstream/main
pnpm install

# 2. 全量构建
pnpm build && pnpm ui:build

# 3. 推送并运行
git push origin main
myclaw run
```

---

## 核心流程 2：上游同步 + 最小化构建 (推荐日常使用)

**适用场景**：快速获取上游新特性（如 DeepSeek V4 支持），仅构建运行 Gateway 必须的组件。

```bash
# 1. 同步代码
git fetch upstream && git merge upstream/main
pnpm install

# 2. 最小化构建 (仅构建核心逻辑 + UI)
node scripts/build-all.mjs gatewayWatch && pnpm ui:build

# 3. 推送并运行
git push origin main
myclaw run
```

---

## 核心流程 3：多端同步 (其他机器更新)

**适用场景**：已经在主力机同步并推送后，在其他机器（如笔记本、服务器）同步代码。

```bash
# 1. 拉取自己 Fork 的代码
git pull origin main
pnpm install

# 2. 最小化构建
node scripts/build-all.mjs gatewayWatch && pnpm ui:build

# 3. 运行
myclaw run
```

---

## 💡 常见问题处理

### 1. 合并被阻挡 (a2ui 文件冲突)

若执行 `git merge` 报错提示 `src/canvas-host/a2ui/` 下的文件将被覆盖，请先执行：

```bash
rm -f src/canvas-host/a2ui/.bundle.hash src/canvas-host/a2ui/a2ui.bundle.js
```

然后再重新尝试 `git merge`。

### 2. IDE (Cursor) 报错红线

若 IDE 无法识别 SDK 的 API，请运行以下命令生成类型定义：

```bash
pnpm build:plugin-sdk:dts
```

然后执行 `TypeScript: Restart TS Server`。

### 3. 彻底清理缓存

若怀疑构建产物有问题，可先清理：

```bash
rm -rf dist/
```
