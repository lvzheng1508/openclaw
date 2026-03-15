# 会话简介生成（Execution）

## 范围

- 在现有会话管理 UI 中新增「生成简介」功能。
- 使用默认 agent 的主模型，基于会话前 3 轮对话生成 5–25 字摘要。
- 摘要持久化到 `~/.openclaw/agents/{agentId}/sessions/summaries.json`，避免重复生成。
- 仅影响 Control UI 和 gateway 的 `sessionHistory` 相关逻辑。

## 执行顺序

1. 新增 `sessionHistory.summarize` 协议与后端 handler。
2. 扩展 `sessionHistory.list` 返回 `summary` 字段。
3. 实现输入清洗：跳过 Session Startup 提示、剥离 Sender 元数据、截断长回复。
4. 前端调用 `sessionHistory.summarize`，展示简介列。
5. 优化 system prompt 与字数限制，提升摘要质量。
6. UI 调整：简介列居中、Session ID 显示 25 字符。

## 检查点

### 检查点 1

- `sessionHistory.summarize` 可用，摘要写入 `summaries.json`。
- `sessionHistory.list` 包含 `summary`。
- 简介列和「生成简介」按钮正常展示。

### 检查点 2

- 输入清洗生效：不包含 Session Startup、Sender metadata。
- 助手回复截断至 150 字，摘要以主题概括为主。
- 字数限制 5–25 字，无截断导致的半句。

### 检查点 3

- 简介列居中；Session ID 列显示 25 字符。
- 删除会话时同步清理 `summaries.json` 对应条目。
- 无调试日志残留。

## 约束

- 不修改已有的 `sessionHistory.list` / `get` / `delete` 协议结构。
- 路径通过 `resolveSessionTranscriptsDirForAgent` 等共享 helper 解析。
- 摘要生成使用 `agentCommandFromIngress`，复用默认 agent 配置。
- `sessionHistory.summarize` 需 `operator.admin` 权限。
