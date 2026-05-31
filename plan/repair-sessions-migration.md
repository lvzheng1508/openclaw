# OpenClaw 2026.5.15 升级后会话路由修复指南

## 问题背景
在从旧版本升级到 OpenClaw `2026.5.15`（及以上）版本后，由于系统引入了强 Agent 隔离的路由机制，会导致历史会话在 UI 中消失或无法加载。主要原因是 `sessions.json` 中的会话键（Key）格式不兼容。

## 故障表现
1.  在 UI 中选中某个 Agent（如 `assistant-circle`）后，会话列表为空。
2.  即使勾选了 "Show Archived"，仍看不到历史会话。
3.  点击历史会话 URL 报错或提示 "Session not found"。

## 修复原理
将旧版的短 Key 格式（如 `harness`）迁移为新版的规范化 Key 格式（如 `agent:assistant-circle:harness`）。

## 执行步骤

### 1. 备份原始索引
在进行任何修改前，必须备份对应 Agent 的会话索引文件。
```bash
# 示例：为 assistant-circle 创建备份
cp ~/.openclaw/agents/assistant-circle/sessions/sessions.json ~/.openclaw/agents/assistant-circle/sessions/sessions.json.bak
```

### 2. 执行修复脚本
使用 `scratch/fix-session-keys.ts` 脚本进行迁移。该脚本会遍历 JSON 文件并自动补全前缀。

**方式 A：使用现有脚本（推荐）**
```bash
# 进入项目根目录
npx tsgo scratch/fix-session-keys.ts
```

**方式 B：如果 tsgo 不可用，使用 Perl 命令行快速修复**
```bash
# 针对特定 Agent (如 assistant-circle) 批量修改
perl -i -pe 's/^  "([^"agent:][^"]+)": \{/  "agent:assistant-circle:$1": {/g' ~/.openclaw/agents/assistant-circle/sessions/sessions.json
```

### 3. 清除 Gateway 缓存
修改文件后，Gateway 的内存缓存需要更新。
*   **动作**：彻底关闭 Gateway 进程（`myclaw` 或 `npm run dev`）。
*   **动作**：重新启动 Gateway。

### 4. UI 验证与加载
1.  进入 UI，确认左侧/顶部选中的 Agent 与你修复的一致。
2.  **关键步骤**：由于历史会话通常超过 120 分钟未更新，请在会话列表中勾选 **"Show Archived"**（显示已归档）。
3.  点击旧会话，确认对话历史能够正常渲染。

## 注意事项
*   **Key 唯一性**：如果手动修改，请确保 Key 唯一，且包含 `agent:<id>:` 前缀。
*   **Transcript 路径**：只要 `sessionFile` 指向的路径正确，对话记录（.jsonl）就不会丢失。
*   **多 Agent 修复**：如果有多个 Agent 的会话都消失了，需要分别为每个 Agent 的 `sessions.json` 执行上述步骤。

---
*Created At: 2026-05-15*
*Applicable Version: 2026.5.15+*
