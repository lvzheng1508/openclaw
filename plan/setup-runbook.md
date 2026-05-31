# OpenClaw 本机安装与维护 Runbook

> 适用系统：macOS（Apple Silicon / Intel 均可）  
> Node 版本要求：Node 22.16+ 或 Node 24（推荐）  
> 本文档记录了从"源码构建"迁移到"标准全局安装"的完整操作步骤，供 LLM 或人工直接按步骤执行。

---

## 背景说明

本机在 `/Users/lvzheng/Cursor/openclaw` 中保存了 OpenClaw 的完整源代码（用于阅读和开发参考），但**日常运行使用全局 npm 安装的版本**，两者共享同一个数据工作区 `~/.openclaw`。

| 角色           | 路径                                      | 说明                               |
| -------------- | ----------------------------------------- | ---------------------------------- |
| 源码仓库       | `/Users/lvzheng/Cursor/openclaw`          | 仅供阅读/开发，不用于运行          |
| 数据工作区     | `~/.openclaw`                             | 聊天历史、渠道配置、Skills、日志等 |
| 全局可执行文件 | `~/.nvm/versions/node/v22.x/bin/openclaw` | 通过 npm 安装的生产版本            |

---

## 一、标准全局安装 openclaw

### 前提检查

```zsh
node --version   # 需要 v22.16+ 或 v24+
npm --version    # 需要 10+
```

### 安装

```zsh
npm install -g openclaw@latest
```

### 验证安装成功

```zsh
which openclaw        # 应输出类似 ~/.nvm/versions/node/v22.x/bin/openclaw
openclaw --version    # 输出版本号
openclaw doctor       # 读取 ~/.openclaw/openclaw.json 并检查所有配置项
```

`openclaw doctor` 正常时会显示：

- `Config: /Users/lvzheng/.openclaw/openclaw.json` — 说明数据工作区已被正确读取
- `Gateway not running.` — 正常，服务还没启动
- 各 Skills 的缺失依赖列表（可忽略，不影响基本使用）

> ⚠️ **不要**运行 `openclaw onboard --install-daemon`，该命令会注册开机自启服务，本机不需要。

---

## 二、清理源码目录中的构建产物

源码目录在初次 `pnpm install && pnpm build` 后会产生大量构建产物，占用 ~6 GB，可安全删除（代码和 Git 历史完全保留）。

### 可删除的目录（构建产物）

| 目录            | 典型大小 | 说明                                   |
| --------------- | -------- | -------------------------------------- |
| `dist/`         | ~124 MB  | TypeScript 编译输出                    |
| `dist-runtime/` | ~15 MB   | 运行时编译输出                         |
| `node_modules/` | ~1.8 GB  | 开发依赖包（`pnpm install` 可恢复）    |
| `.pnpm-store/`  | ~1.1 GB  | pnpm 本地包缓存                        |
| `.local/`       | ~2.9 GB  | 插件运行时二进制缓存（构建时自动生成） |

### 执行清理

```zsh
rm -rf /Users/lvzheng/Cursor/openclaw/dist \
       /Users/lvzheng/Cursor/openclaw/dist-runtime \
       /Users/lvzheng/Cursor/openclaw/node_modules \
       /Users/lvzheng/Cursor/openclaw/.pnpm-store \
       /Users/lvzheng/Cursor/openclaw/.local
```

### 验证清理结果

```zsh
du -sh /Users/lvzheng/Cursor/openclaw
# 预期：~1.7 GB（剩余为源码 + .git 历史）
```

### 如需重新构建（开发时才需要）

```zsh
cd /Users/lvzheng/Cursor/openclaw
pnpm install   # 恢复 node_modules
pnpm build     # 重新生成 dist/
```

---

## 三、配置 myclaw 快捷命令

完整说明见同目录下的 [myclaw-shortcuts.md](./myclaw-shortcuts.md)，包含函数代码、写入方式、验证步骤和常见问题。

### 快速检查是否已配置

```zsh
grep -n "myclaw shortcuts" ~/.zshrc
# 输出了行号说明已存在；否则按 myclaw-shortcuts.md 第 1 节操作
```

### 配置完成后让当前终端生效

```zsh
source ~/.zshrc
```

---

## 四、日常使用命令速查

### 启动与停止

```zsh
myclaw run      # 后台启动 gateway（推荐）
myclaw stop     # 停止 gateway
myclaw status   # 查看运行状态
myclaw restart  # 重启 gateway
```

### 查看日志

```zsh
tail -f ~/.openclaw/gateway.log     # 实时跟踪日志
tail -n 100 ~/.openclaw/gateway.log # 查看最近100行
```

### 透传 openclaw 原生命令

```zsh
myclaw doctor           # 等同于 openclaw doctor
myclaw agent --help     # 等同于 openclaw agent --help
```

---

## 五、升级与回滚

### 升级到最新稳定版

```zsh
openclaw update
# 或
npm update -g openclaw@latest

openclaw doctor   # 升级后验证
```

### 切换发布频道

```zsh
openclaw update --channel stable   # 稳定版（默认）
openclaw update --channel beta     # 测试版
openclaw update --channel dev      # 开发版（最前沿）
```

### 查看历史版本并回滚

```zsh
npm view openclaw versions          # 列出所有历史版本
npm install -g openclaw@2026.5.14   # 回滚到指定版本

myclaw restart   # 回滚后重启
openclaw doctor  # 验证
```

---

## 六、故障排查

### gateway 无法停止

```zsh
# 查看占用端口的进程
lsof -nP -iTCP:18789 -sTCP:LISTEN

# 强行杀死
lsof -tiTCP:18789 -sTCP:LISTEN | xargs kill -9
pkill -9 -f 'openclaw gateway'
```

### 查看详细日志

```zsh
tail -n 100 ~/.openclaw/gateway.log
```

### 端口被其他程序占用

```zsh
lsof -nP -iTCP:18789   # 查看是谁占用了 18789 端口
# 如需更换端口，在启动时设置环境变量：
MYCLAW_GATEWAY_PORT=19999 myclaw run
```

### openclaw 命令找不到

```zsh
# 确认 npm 全局路径在 PATH 中
which openclaw
npm list -g openclaw   # 确认已全局安装

# 如果找不到，重新安装
npm install -g openclaw@latest
```
