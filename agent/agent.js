// 💡 学习要点：这是整个项目的核心 —— Agent 主逻辑
// 将五大模块串联为一个完整的智能体：
//   Prompt 模板 → 模型选型 → RAG 检索 → 技能调用 → 最终回答
//
// Agent 的核心思想：不是简单的"一问一答"，而是一个自主决策的循环
// 1. 理解用户意图
// 2. 决定是否需要检索知识库
// 3. 决定是否需要调用工具
// 4. 综合所有信息生成回答

import { render } from './core/prompt/templates.js';
import { selectModel } from './core/model/selector.js';
import { runAgentLoop } from './core/skills/executor.js';
import { registry } from './core/skills/registry.js';
import { initKnowledgeBase, retrieve, getStatus } from './core/knowledge/local/retriever.js';
import { getMode } from './core/llm.js';

/**
 * Agent 类 —— 智能体的完整实现
 *
 * 💡 设计原则：
 * - 配置驱动：通过 config 控制 Agent 行为
 * - 模块化：每个能力模块可独立开关
 * - 可观测：每一步都有日志，方便调试
 */
export class Agent {
  /**
   * @param {object} config
   * @param {string} config.name - Agent 名称
   * @param {string} config.tone - 回答风格
   * @param {boolean} config.ragEnabled - 是否启用 RAG
   * @param {string} config.model - 指定模型（null 则自动选择）
   * @param {boolean} config.autoSelectModel - 是否自动选择模型
   */
  constructor(config = {}) {
    this.name = config.name || 'AI 学习助手';
    this.tone = config.tone || '专业但友好';
    this.ragEnabled = config.ragEnabled !== false;
    this.model = config.model || null;
    this.autoSelectModel = config.autoSelectModel !== false;
    this.ragInitialized = false;

    // 统计信息
    this.stats = {
      totalMessages: 0,
      totalToolCalls: 0,
      totalTokens: 0,
    };
  }

  /**
   * 初始化 Agent
   * 💡 必须在使用前调用，完成知识库加载等初始化工作
   */
  async init() {
    console.log(`🤖 初始化 Agent: ${this.name}`);
    console.log(`📡 运行模式: ${getMode() === 'live' ? '真实 API' : 'Mock 模拟'}`);

    // 初始化知识库
    if (this.ragEnabled) {
      try {
        await initKnowledgeBase();
        this.ragInitialized = true;
        console.log('📚 RAG 知识库已就绪');
      } catch (err) {
        console.warn('⚠️  知识库初始化失败:', err.message);
        this.ragEnabled = false;
      }
    }

    // 打印已注册技能
    console.log(`🔧 已注册技能: ${registry.list().map(s => s.name).join(', ')}`);

    console.log('✅ Agent 初始化完成\n');
    return this;
  }

  /**
   * 与 Agent 对话
   *
   * 💡 这是 Agent 的主入口，串联所有模块：
   * 1. Prompt 模板渲染 → 构造 System Prompt
   * 2. 模型选型 → 决定用哪个模型
   * 3. RAG 检索 → 如果需要，搜索知识库
   * 4. Agent Loop → 模型推理 + 工具调用循环
   * 5. 返回结果
   */
  async chat(userMessage, options = {}) {
    this.stats.totalMessages++;

    // Step 1: 渲染 System Prompt
    const capabilities = [
      '回答各类知识问题',
      '查询天气信息',
      '执行数学计算',
      '搜索知识库',
      '获取当前时间',
    ];

    let systemPrompt = render('agent_system', {
      agent_name: this.name,
      capabilities: capabilities.join('、'),
      tone: this.tone,
    });

    // Step 2: RAG 检索（如果启用）
    if (this.ragEnabled && this.ragInitialized) {
      const ragResults = retrieve(userMessage, { topK: 3 });

      if (ragResults.length > 0) {
        // 💡 将 RAG 检索结果注入 System Prompt
        const references = ragResults
          .map((r, i) => `[${i + 1}] ${r.content}`)
          .join('\n\n');

        systemPrompt += `\n\n📚 知识库检索结果（请优先参考）:\n${references}`;
      }
    }

    // Step 3: 模型选型
    let model = this.model;
    if (!model && this.autoSelectModel) {
      const selection = selectModel(userMessage);
      model = selection.recommendedModel;
      if (options.verbose) {
        console.log(`🤖 模型选型: ${selection.recommendedModel} (${selection.reason})`);
      }
    }
    model = model || 'claude-sonnet-4-6-20250514';

    // Step 4: 运行 Agent Loop
    const result = await runAgentLoop({
      userMessage,
      system: systemPrompt,
      model,
      skillRegistry: registry,
      onToolCall: (blocks) => {
        for (const block of blocks) {
          this.stats.totalToolCalls++;
          console.log(`  🔧 调用工具: ${block.name}`, JSON.stringify(block.input));
        }
      },
      onToolResult: (name, result) => {
        console.log(`  ✅ 工具结果: ${name} → ${String(result).slice(0, 80)}...`);
      },
    });

    // 更新统计
    this.stats.totalTokens += result.stats?.totalInputTokens + result.stats?.totalOutputTokens || 0;

    return {
      text: result.text,
      model,
      stats: result.stats,
    };
  }

  /**
   * 获取 Agent 状态
   */
  getStatus() {
    return {
      name: this.name,
      mode: getMode(),
      ragEnabled: this.ragEnabled,
      ragInitialized: this.ragInitialized,
      ragStatus: getStatus(),
      skills: registry.list(),
      stats: this.stats,
    };
  }
}

/**
 * 快速创建并初始化 Agent
 */
export async function createAgent(config) {
  const agent = new Agent(config);
  await agent.init();
  return agent;
}
