# AI Agent Harness 相关文章汇总

> 收集时间：2026-04-03
> 范围：国内外各大厂近一年围绕 Agent Harness（代理脚手架/框架设计）的工程博客、研究文章和产品文档

---

## 一、Anthropic（Claude）

Anthropic 是目前 Harness 话题最活跃的发声者，发布了多篇系统性文章。

### 1. Building Effective Agents（构建有效的代理）

- **链接**：https://www.anthropic.com/engineering/building-effective-agents
- **时间**：2024 年底
- **核心观点**：
  - 将 agentic systems 分为 **Workflows**（预定义代码路径编排）和 **Agents**（LLM 动态自主决策）两类
  - 核心原则："找到尽可能最简单的解决方案，只在需要时才增加复杂性"
  - 从增广 LLM → 组合式工作流 → 自主代理的渐进式复杂度模型
  - 提及 Claude Agent SDK、AWS Strands Agents SDK、Rivet、Vellum 等框架
- **关键词**：workflow vs agent、简单优先、渐进增强

### 2. Effective Harnesses for Long-Running Agents（长时间运行代理的有效 Harness）

- **链接**：https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- **时间**：2025 年
- **核心观点**：
  - 长时间运行代理的核心挑战：每个新会话没有之前的记忆
  - 两部分解决方案：**Initializer Agent**（初始化环境）+ **Coding Agent**（逐步推进 + 留下结构化工件）
  - 关键工件：`claude-progress.txt` 文件让新会话快速理解工作状态
  - 两种失败模式：一次做太多（one-shot 倾向）、过早宣布完成
- **关键词**：context reset、结构化工件、progress file、增量推进

### 3. Effective Context Engineering for AI Agents（AI 代理的有效上下文工程）

- **链接**：https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- **时间**：2025 年
- **核心观点**：
  - 上下文工程是提示工程的自然演进——关注点从"怎么写提示"扩展到"如何管理整个上下文状态"
  - 提出 **context rot**（上下文腐烂）概念：token 越多，模型准确召回能力越下降
  - LLM 有"注意力预算"，每个新 token 都消耗预算
  - 上下文工程是**迭代式**的，每次推理前都要重新策划
- **关键词**：context rot、注意力预算、上下文窗口管理

### 4. Harness Design for Long-Running Application Development（长时间运行应用开发的 Harness 设计）

- **链接**：https://www.anthropic.com/engineering/harness-design-long-running-apps
- **时间**：2026 年
- **核心观点**：
  - GAN 启发的多代理架构：**Planner → Generator → Evaluator** 三代理系统
  - 生成器-评估器分离解决"自我评估偏差"问题
  - Sprint 契约机制：每个冲刺前协商"完成"标准
  - Opus 4.6 消除了上下文焦虑，可以移除冲刺结构，简化 harness
  - 评估器的价值取决于任务是否超出模型独立完成的边界
  - **核心洞见**：harness 的有趣组合空间不随模型改进而缩小，只是移动
- **关键词**：GAN、planner/generator/evaluator、sprint contract、模型能力边界

---

## 二、Cursor

Cursor 在 Harness 实践上走得很前沿，多篇研究博客直接展示了大规模代理运行的实际经验。

### 5. The Third Era of AI Software Development（AI 软件开发的第三时代）

- **链接**：https://cursor.com/blog/third-era
- **时间**：2026-02-26
- **核心观点**：
  - 三个时代：Tab 补全 → 同步 Agent → **自主云 Agent**
  - Agent 用户在一年内增长超过 15 倍，现在 Agent 用户是 Tab 用户的 2 倍
  - Cursor 内部 35% 的 PR 由自主运行的云 Agent 创建
  - 人类角色从"引导每一行代码"转变为"定义问题和设置审查标准"
  - Cloud Agent 在独立 VM 上运行数小时，返回日志、视频录制和实时预览
- **关键词**：cloud agents、artifacts、自主化、审查者角色

### 6. Scaling Long-Running Autonomous Coding（规模化长时间自主编码）

- **链接**：https://cursor.com/blog/scaling-agents
- **时间**：2026 年
- **核心观点**：
  - 单代理局限 → 多代理并行挑战 → **Planners + Workers** 架构
  - 自协调失败案例：锁竞争、风险规避、无人负责端到端实现
  - 最终方案：规划器持续探索代码库创建任务（可递归子规划），工人只专注完成分配任务
  - 每轮末尾有 Judge Agent 决定是否继续
  - 实验案例：从零构建 Web 浏览器（一周、100 万行代码、1000 文件）、Solid→React 迁移
- **关键词**：planner-worker、judge agent、自我协调失败、大规模并行

### 7. Towards Self-Driving Codebases（迈向自动驾驶代码库）

- **链接**：https://cursor.com/blog/self-driving-codebases
- **时间**：2026 年
- **核心观点**：
  - 单一大 VM 上运行 Harness（非分布式系统），简化复杂性
  - Rust-based harness 实现
  - 重点投入可观测性：日志所有 Agent 消息、系统动作、命令输出
  - 自协调方案失败后转向层级化协调
  - 展示了数千 Agent 协作一周构建浏览器的成果
- **关键词**：可观测性、Rust harness、层级化协调

### 8. Training Composer for Longer Horizons（训练 Composer 应对更长任务）

- **链接**：https://cursor.com/blog/self-summarization
- **时间**：2026-03-17
- **核心观点**：
  - 提出 **Self-Summarization** 技术：将压缩作为模型训练的一部分
  - 触发机制：达到固定 token 长度 → 插入合成查询 → 模型自我总结 → 用压缩上下文继续
  - 训练时将多轮生成链通过摘要串联，自我摘要本身成为奖励信号的一部分
  - 对比精心调优的基于 prompt 的压缩基线，token 效率显著提升
  - 允许从远超上下文窗口长度的轨迹中获取训练信号
- **关键词**：self-summarization、compaction-in-the-loop、RL 训练、token 效率

### 9. Composer 2 技术报告

- **链接**：https://cursor.com/blog/composer-2-technical-report
- **时间**：2026-03-27
- **核心观点**：Composer 2 模型的技术细节，包含 frontier 级别编码能力、更高 token 效率

### 10. Improving Composer Through Real-Time RL

- **链接**：https://cursor.com/blog/real-time-rl-for-composer
- **时间**：2026-03-26
- **核心观点**：通过实时强化学习改进 Composer 代理

---

## 三、OpenAI

### 11. Introducing Codex（介绍 Codex）

- **链接**：https://openai.com/index/introducing-codex/
- **时间**：2025 年 4 月（2025-06-03 更新支持 Plus 用户）
- **核心观点**：
  - 基于 **codex-1**（o3 的编码优化版本）的云端软件工程代理
  - 每个任务在独立隔离的云沙箱环境中运行，预加载仓库代码
  - 可并行处理多个任务
  - 支持 **AGENTS.md** 文件引导代理行为（类似 Claude 的 CLAUDE.md）
  - 提供可验证的证据：终端日志引用和测试输出
- **关键词**：codex-1、cloud sandbox、AGENTS.md、可验证输出

### 12. Codex 文档（开发者文档）

- **链接**：https://developers.openai.com/codex/cloud
- **时间**：持续更新
- **内容**：
  - Cloud Codex 可以后台并行工作
  - 支持 GitHub 集成、IDE 扩展委托
  - 环境配置：仓库选择、设置步骤、工具选择
  - 可控制网络访问权限
- **关键词**：cloud delegation、环境配置、GitHub 集成

---

## 四、Google

### 13. Agent Development Kit (ADK)

- **链接**：https://adk.dev/
- **时间**：2025-2026 年（持续更新，已发布 Python / TypeScript / Go / Java SDK）
- **核心观点**：
  - Google 的模块化 Agent 开发框架，为 Gemini 优化但模型无关
  - 核心能力：灵活编排（顺序/并行/循环）、多代理架构、丰富工具生态、内置评估
  - ADK Go 1.0 支持 OpenTelemetry 集成和自愈逻辑
  - 部署就绪：本地运行、Vertex AI Agent Engine 扩展、Cloud Run / Docker
- **关键词**：ADK、多代理、自愈、OpenTelemetry

---

## 五、Microsoft

### 14. AutoGen

- **链接**：https://microsoft.github.io/autogen/
- **时间**：持续更新
- **核心观点**：
  - 微软的开源多代理框架
  - 支持可组合、可扩展和可观测的代理系统
  - 从 AutoGen 0.2 到新版本的演进，增加了更好的状态管理和对话流程控制
- **关键词**：多代理编排、开源框架、可扩展

---

## 六、其他值得关注的开源项目 / 社区

### 15. OpenClaw（你正在使用的）

- **链接**：https://github.com/openclaw/openclaw
- **文档**：https://docs.openclaw.ai
- **特点**：个人 Agent 网关 + 多渠道 + 多节点 + Skills 系统

### 16. Claude Code（Anthropic CLI 工具）

- **链接**：https://code.claude.com/docs
- **特点**：终端/IDE/桌面应用全平台代理编码工具，支持 AGENTS.md、MCP 集成

---

## 七、关键趋势总结

| 趋势                         | 说明                                                                  |
| ---------------------------- | --------------------------------------------------------------------- |
| **从单代理到多代理**         | 几乎所有厂商都在向多代理架构演进（Planner-Worker-Judge 模式成为共识） |
| **生成器-评估器分离**        | Anthropic 首倡，Cursor、Google 等都在实践——避免自我评估偏差           |
| **上下文管理是核心工程问题** | 从简单的 compaction 到训练级别的 self-summarization（Cursor）         |
| **云沙箱化运行**             | OpenAI Codex、Cursor Cloud Agents 都采用独立 VM 隔离运行              |
| **Harness 应随模型能力演进** | 模型越强，harness 越应简化；但新能力也打开了新的组合空间              |
| **可观测性至关重要**         | Cursor 强调日志所有 Agent 行为用于分析和回放                          |
| **AGENTS.md 成为标准**       | OpenAI 和 Anthropic 都采用项目级配置文件引导代理行为                  |
| **自主化程度持续提升**       | 从"人在回路中"到"人定义问题 + 代理自主执行 + 人审查结果"              |

---

## 八、推荐阅读顺序

如果你想系统了解 Harness 设计，建议按以下顺序阅读：

1. **Building Effective Agents**（Anthropic）— 基础框架和设计原则
2. **Effective Context Engineering**（Anthropic）— 上下文管理的理论基础
3. **Effective Harnesses for Long-Running Agents**（Anthropic）— 长时间运行的核心挑战
4. **Harness Design for Long-Running Apps**（Anthropic）— 最新的三代理架构实践
5. **The Third Era**（Cursor）— 行业趋势概览
6. **Scaling Long-Running Autonomous Coding**（Cursor）— 大规模多代理实践经验
7. **Training Composer for Longer Horizons**（Cursor）— 训练级别的压缩创新
8. **Introducing Codex**（OpenAI）— 云端代理产品视角
9. **ADK**（Google）— 框架化实现视角
