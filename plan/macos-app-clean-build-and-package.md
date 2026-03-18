# macOS App 完整干净构建与打包规范

## 目标

- 从源码完成一次**完整、干净**的构建与打包，产出可运行的 macOS 应用 `OpenClaw.app`。
- 清理所有相关构建产物，避免使用陈旧缓存，尽早暴露集成与依赖问题。
- 流程可复现，与 [From source (development)](https://github.com/openclaw/openclaw#from-source-development) 及 [macOS Dev Setup](https://docs.openclaw.ai/platforms/mac/dev-setup) 一致。

## 前置条件

- **系统**：macOS（构建须在本机执行，不可通过 SSH 远程构建）。
- **Xcode 26.2+**：提供 Swift 6.2 工具链与 macOS SDK。
- **Node.js 22+**（推荐 24）与 **pnpm**：用于 CLI、Gateway 与打包脚本。
- 当前所在分支即目标分支；工作区状态可追踪（不使用 stash）。

验证环境：

```bash
xcodebuild -version
xcrun swift --version
node -v
pnpm -v
```

## 彻底构建与打包步骤（必做）

按顺序执行以下步骤，完成一次干净构建并生成 `dist/OpenClaw.app`。

### 1. 清理构建产物

删除所有与本次构建相关的输出目录，避免旧产物干扰：

```bash
rm -rf dist ui/dist apps/macos/.build
```

可选（完全重装依赖时）：

```bash
rm -rf node_modules
```

### 2. 安装依赖

若未删除 `node_modules`，可按锁文件安装以保持与 CI 一致：

```bash
pnpm install --frozen-lockfile
```

若已删除 `node_modules`，则执行：

```bash
pnpm install
```

> 说明：后续打包脚本 `package-mac-app.sh` 会再次执行 `pnpm install --config.node-linker=hoisted`，以确保打包阶段所需的 hoisted 布局（如 `node_modules/@mariozechner/pi-ai` 等）存在。若希望完全由脚本驱动，可跳过本步，仅做步骤 1 后直接执行步骤 3。

### 3. 构建 JS 与 Control UI（推荐显式执行）

与 [merge-and-clean-build-spec.md](./merge-and-clean-build-spec.md) 中的彻底构建顺序一致，先构建 UI 再构建主工程：

```bash
pnpm ui:build
pnpm build
```

### 4. 执行 macOS 打包脚本

打包脚本会：再次确保依赖（hoisted）、执行 `pnpm build` 与 `node scripts/ui.js build`（除非跳过）、编译 Swift 工程、组装 `.app` 并签名。

**方式 A：完整由脚本执行（已做步骤 1，未做 2、3 时）**

```bash
./scripts/package-mac-app.sh
```

**方式 B：已做步骤 2、3 时（跳过脚本内 TS 与 UI 构建以节省时间）**

```bash
SKIP_TSC=1 SKIP_UI_BUILD=1 ./scripts/package-mac-app.sh
```

产物路径：`dist/OpenClaw.app`。

### 5. 代码质量检查（可选）

与合并规范保持一致，可在打包前或打包后执行：

```bash
pnpm check
```

若任一步失败：先修复当前失败项，从失败步骤重新执行；仅当构建与打包全部通过，才视为本次完整干净构建完成。

## 验收标准

- 已执行步骤 1（清理），无残留的 `dist`、`ui/dist`、`apps/macos/.build`（或已按需清理 `node_modules`）。
- 依赖安装成功；`pnpm ui:build`、`pnpm build` 已执行并通过（或由打包脚本内执行并通过）。
- `./scripts/package-mac-app.sh` 执行完成且无报错。
- 存在且可启动：`dist/OpenClaw.app`（可通过 `open dist/OpenClaw.app` 或 `pnpm mac:open` 验证）。

## 参考

- 合并与彻底构建规范：[plan/merge-and-clean-build-spec.md](./merge-and-clean-build-spec.md)
- 仓库 From source (development)：[GitHub openclaw#from-source-development](https://github.com/openclaw/openclaw#from-source-development)
- macOS 开发环境与故障排除：[docs/platforms/mac/dev-setup.md](https://docs.openclaw.ai/platforms/mac/dev-setup)（[本地路径](../docs/platforms/mac/dev-setup.md)）
