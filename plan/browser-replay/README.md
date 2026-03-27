# 当前 Chrome（`user` profile）

用官方 **existing-session**：控制**正在用的 Chrome**，不单独起 OpenClaw 托管浏览器。详见 [Browser](https://docs.openclaw.ai/tools/browser)。

## 怎么做

1. Chrome 打开 **`chrome://inspect/#remote-debugging`**，启用远程调试，保持 Chrome 运行。
2. `~/.openclaw/openclaw.json` 里设：

```json
"browser": { "enabled": true, "defaultProfile": "user" }
```

3. **启动 Gateway**。第一次用浏览器时 Gateway 会按需拉起 `chrome-devtools-mcp`（需本机有 **Node / npx**）；有附加提示时点允许。

验证（可选）：

```bash
openclaw browser --browser-profile user status
```

## 脚本（可选）

`start-chrome-devtools-mcp.sh`：仅排障或想**单独**跑 MCP 时用；日常不必执行。
