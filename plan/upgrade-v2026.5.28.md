# v2026.5.28 升级说明

## GLM（zai provider）需要手动配置 baseUrl

### 现象

启动 `myclaw run` 后 gateway 正常 ready，但发送对话时 GLM 模型无响应。

### 原因

v2026.5.28 中 zai plugin 的 baseUrl 未被正确注入到 provider transport，请求 fallback 到了默认的 `api.openai.com`，导致认证失败。

### 修复

在 `~/.openclaw/openclaw.json` 中添加 `models.providers.zai` 配置，指定 Coding 专用端点：

```json
{
  "models": {
    "providers": {
      "zai": {
        "baseUrl": "https://open.bigmodel.cn/api/coding/paas/v4"
      }
    }
  }
}
```

修改后重启 gateway：

```bash
myclaw restart
```
