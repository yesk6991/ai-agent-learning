# AI Agent 学习项目 — 实现计划

## 项目目标

为一位正在转型 AI 工程化的前端工程师，构建一个**可运行、可学习、可扩展**的 Agent 系统，覆盖以下五大核心模块：

1. **Prompt Engineering** — 提示词技巧与模板系统
2. **知识库 (RAG)** — 文档检索增强生成
3. **评测 (Evaluation)** — 输出质量评估与量化
4. **技能调用 (Tool Use)** — Agent 工具调用机制
5. **模型选型 (Model Selection)** — 模型对比与场景适配

## 整体架构

```
agent/
├── core/                        # 核心模块（每模块可独立运行学习）
│   ├── prompt/                  # 🎯 Prompt Engineering
│   │   ├── techniques.js        #   技巧库：CoT / Few-shot / ReAct / 结构化输出
│   │   └── templates.js         #   模板系统：变量插值 / 版本管理
│   ├── knowledge/               # 📚 知识库 (RAG)
│   │   ├── local/               #   本地实现（零依赖，原理清晰）
│   │   │   ├── chunker.js       #     文档分块
│   │   │   ├── embedder.js      #     TF-IDF 向量化
│   │   │   ├── retriever.js     #     余弦相似度检索
│   │   │   └── store.js         #     内存向量存储
│   │   └── langchain/           #   LangChain 实现（生产级方案）
│   │       ├── pipeline.js      #     RAG 完整流水线
│   │       └── README.md        #     LangChain 方案说明与依赖
│   ├── evaluation/              # 📊 评测
│   │   ├── metrics.js           #   评测指标：相似度 / 关键词命中率 / 一致性
│   │   ├── runner.js            #   评测运行器
│   │   └── cases.js             #   测评用例
│   ├── skills/                  # 🔧 技能调用 (Tool Use)
│   │   ├── registry.js          #   技能注册中心
│   │   ├── executor.js          #   技能执行器（含多轮工具调用循环）
│   │   └── definitions/         #   技能定义
│   │       ├── weather.js       #     天气查询
│   │       ├── calculator.js    #     数学计算
│   │       ├── search.js        #     知识库搜索（串联 RAG）
│   │       └── timer.js         #     定时/提醒
│   └── model/                   # 🤖 模型选型
│       ├── profiles.js          #   模型画像（能力/成本/延迟）
│       ├── selector.js          #   智能模型选择器
│       └── comparator.js        #   A/B 对比实验
│
├── agent.js                     # 🧠 Agent 主逻辑（对话模式入口）
├── cli.js                       # 💻 CLI 交互界面
├── knowledge-base/              # 📁 知识库文档
│   ├── ai-basics.md             #   AI 基础概念
│   ├── prompt-guide.md          #   Prompt 工程指南
│   └── rag-intro.md             #   RAG 入门
│
└── demos/                       # 🎓 分模块独立演示脚本
    ├── demo-prompt.js           #   Prompt 技巧演示
    ├── demo-rag.js              #   RAG 检索演示
    ├── demo-evaluation.js       #   评测流程演示
    ├── demo-skills.js           #   技能调用演示
    └── demo-model.js            #   模型选型演示
```

## 模块详细设计

### 1. Prompt Engineering 模块

**techniques.js** — 6 种核心技巧，每种都有原理注释 + 可运行示例：
- **Zero-shot**：直接提问，观察模型基准表现
- **Few-shot**：给出示例，引导输出格式
- **Chain-of-Thought (CoT)**："一步步思考"，推理链
- **ReAct**：Reason + Act 交替，Agent 基础范式
- **结构化输出**：JSON Schema 约束输出格式
- **角色设定**：System Prompt 定义 Agent 人格

**templates.js** — Prompt 模板系统：
- 变量插值 `{{variable}}`
- 模板版本管理
- 便于 A/B 测试不同 Prompt 版本

### 2. 知识库 (RAG) 模块

**本地实现（核心学习路径）**：
- `chunker.js`：按固定大小 / 语义段落分块，带重叠（overlap）
- `embedder.js`：TF-IDF 向量化（纯 JS 实现，无需外部 API）
- `retriever.js`：余弦相似度检索 Top-K
- `store.js`：内存向量存储，支持 CRUD
- 完整流程：文档加载 → 分块 → 向量化 → 索引 → 查询 → 上下文注入 → LLM 生成

**LangChain 实现（生产级对比）**：
- `pipeline.js`：使用 LangChain.js + OpenAI Embeddings + Chroma/Pinecone
- 需额外依赖，单独 README 说明安装步骤
- 与本地版对比，理解工程化 RAG 的取舍

### 3. 评测 (Evaluation) 模块

**metrics.js** — 三类评测指标：
- **相似度评测**：字符串相似度（Levenshtein）、语义相似度（LLM-as-Judge）
- **关键词命中率**：预期关键词是否出现在输出中
- **格式一致性**：是否严格遵循 JSON/Markdown 格式

**runner.js** — 评测运行器：
- 批量运行评测用例
- 汇总评分，生成报告
- 支持对比不同 Prompt/模型的评测结果

**cases.js** — 预置评测用例：
- 每个模块都有对应的测试题
- 包含预期答案和评分标准

### 4. 技能调用 (Tool Use) 模块

**registry.js** — 技能注册中心：
- 统一注册/发现技能
- 自动生成 Anthropic Tool Schema

**executor.js** — 核心执行器：
- 实现 Agent 循环：用户输入 → 模型决策 → 工具执行 → 结果回传 → 模型生成
- 支持多轮工具调用（一个回答可连续调用多个工具）
- 与 RAG 模块串联：`search_knowledge_base` 技能

**技能定义**：
- `weather.js`：天气查询（模拟数据）
- `calculator.js`：数学计算（真实执行）
- `search.js`：知识库搜索（调用 RAG 模块）
- `timer.js`：时间查询/计时器

### 5. 模型选型 模块

**profiles.js** — 模型画像数据库：
- Claude 系列：Haiku / Sonnet / Opus 的能力、成本、延迟对比
- 选型决策树：简单任务 → Haiku，复杂推理 → Opus

**selector.js** — 智能模型选择器：
- 根据任务类型、预算、延迟要求自动推荐模型
- 可配置选型策略

**comparator.js** — A/B 对比实验：
- 同一问题发给不同模型
- 自动对比输出质量、Token 消耗、延迟

### 6. Agent 主逻辑 (agent.js)

将五大模块串联为完整 Agent：
1. 接收用户输入
2. Prompt 模板渲染
3. 模型选择器决定使用哪个模型
4. 如果需要知识，调用 RAG 检索
5. 模型决定是否调用工具
6. 工具执行，结果回传
7. 生成最终回答
8. 评测模块可选择性评分

### 7. CLI 交互 (cli.js)

- 基于 readline 的命令行交互
- 支持命令：`/help` `/rag on|off` `/model <name>` `/eval` `/demo` `/quit`
- 彩色输出，Token 用量实时显示

## API Key 处理策略

由于用户暂无 API Key，项目将：
1. **所有模块支持 Mock 模式**：无 Key 时使用模拟数据运行，仍可学习流程
2. **.env 配置指导**：首次运行时提示获取和配置 API Key
3. **渐进式解锁**：有 Key 后功能逐步解锁（Mock → 真实 API）

## 实现顺序

1. 先搭建项目骨架和 Mock 基础设施
2. Prompt 模块（最简单，立即可用）
3. 技能调用模块（在现有 tools.js 基础上扩展）
4. 知识库 RAG 本地实现（核心学习重点）
5. 评测模块（可对前三个模块的输出打分）
6. 模型选型模块（需要 API Key 才有意义）
7. Agent 主逻辑（串联所有模块）
8. LangChain RAG 实现（对比学习）
9. CLI 交互界面

## 代码风格

- 每个文件都有详细的中文注释，解释 **为什么** 这么写
- 每个核心函数前有学习要点（💡 标注）
- 所有示例可直接 `node xxx.js` 运行
- 遵循现有项目的 ESM 风格
