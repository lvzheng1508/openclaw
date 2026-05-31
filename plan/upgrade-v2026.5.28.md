# v2026.5.28 升级说明

## 版本

v2026.5.28

## 升级方式

按照 `upgrade.md` 中的核心流程 2（最小化构建）即可：

```bash
git fetch upstream && git merge upstream/main
pnpm install
node scripts/build-all.mjs gatewayWatch && pnpm ui:build
git push origin main
myclaw run
```

## 已知问题：SSRF 防护导致通过代理的对话无响应

### 现象

启动 `myclaw run` 后 gateway 正常 ready，WebUI 也能打开，但发送对话后无响应。

gateway.log 中出现如下错误：

```
[security] blocked URL fetch (url-fetch) targetOrigin=https://api.openai.com reason=Blocked: resolves to private/internal/special-use IP address
[provider-transport-fetch] [model-fetch] error provider=zai api=openai-completions model=glm-5-turbo ... message=Blocked: resolves to private/internal/special-use IP address
[agent/embedded] embedded run agent end: ... isError=true ... error=LLM request failed: network connection error. rawError=Connection error.
```

随后 fallback 模型也同样失败：

```
model fallback decision: decision=candidate_failed requested=zai/glm-5-turbo candidate=zai/glm-5-turbo reason=timeout next=zai/glm-5.1 detail=Connection error.
Embedded agent failed before reply: All models failed (2): zai/glm-5-turbo: Connection error. (timeout) | zai/glm-5.1: Connection error. (timeout)
```

### 根因

v2026.5.28 新增了 SSRF（Server-Side Request Forgery）安全防护，会检测所有出站请求的目标 IP，若解析到私有/内部 IP 地址则直接拦截。

本机配置了本地代理（Clash/Surge 等），环境变量为：

```
HTTPS_PROXY=http://localhost:63554
```

`zai` provider 使用 OpenAI 兼容 API 格式，请求目标为 `https://api.openai.com`。由于代理的存在，`api.openai.com` 被解析到 `127.0.0.1`（本地代理地址），触发了 SSRF 拦截，导致所有模型请求失败。

### 修复

在 `~/.openclaw/openclaw.json` 的 `gateway` 配置中添加 `ssrfPolicy` 放行规则：

```json
{
  "gateway": {
    "mode": "local",
    "auth": {
      "mode": "none",
      "token": "..."
    },
    "ssrfPolicy": {
      "allowedHostnames": [
        "api.openai.com",
        "localhost",
        "127.0.0.1"
      ]
    }
  }
}
```

修改后重启 gateway：

```bash
myclaw restart
```

### 注意

- `browser` 部分已有独立的 `ssrfPolicy`，但 gateway/provider 级别需要单独配置
- 如果后续新增其他 provider 或代理地址变更，需要同步更新 `allowedHostnames`
- 该问题仅影响通过本地代理访问 API 的场景，直连用户不受影响
