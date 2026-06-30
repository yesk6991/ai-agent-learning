// 💡 学习要点：Prompt Engineering 是 AI 应用开发的第一课
// 本文件包含 6 种核心 Prompt 技巧的模板定义
// 每种技巧都有：原理说明、模板内容、适用场景

/**
 * Prompt 技巧库
 *
 * 💡 为什么要抽象为模板？
 * - 方便 A/B 测试：同一个问题用不同技巧，对比效果
 * - 方便复用：团队共享，避免重复造轮子
 * - 方便评测：每种技巧都可以打分，量化效果
 */
export const techniques = {
  /**
   * 技巧 1：Zero-shot（零样本）
   *
   * 💡 原理：直接提问，不给任何示例
   * - 最简单的 Prompt 方式
   * - 适合简单任务（总结、翻译、问答）
   * - 作为基线(Baseline)与其他技巧对比
   */
  zero_shot: {
    name: 'Zero-shot',
    description: '直接提问，不给示例。最基础的 Prompt 方式',
    apply(question) {
      return question;
    },
  },

  /**
   * 技巧 2：Few-shot（少样本）
   *
   * 💡 原理：给出几个输入-输出示例，让模型理解期望格式
   * - 示例数量通常 2-5 个
   * - 模型会"模仿"示例的模式
   * - 对格式要求严格的任务特别有效
   */
  few_shot: {
    name: 'Few-shot',
    description: '给出几个示例，引导模型按期望格式输出',
    apply(question, examples = []) {
      const examplesText = examples
        .map((ex, i) => `示例${i + 1}:\n输入: ${ex.input}\n输出: ${ex.output}`)
        .join('\n\n');

      return `${examplesText}
        现在请处理：
        输入: ${question}
        输出:`;
    },
  },

  /**
   * 技巧 3：Chain-of-Thought（思维链）
   *
   * 💡 原理：要求模型"一步步思考"，展示推理过程
   * - 对数学推理、逻辑判断等任务效果显著
   * - 关键发现：CoT 让正确率从 17% 提升到 80%+（GSM8K 基准测试）
   * - 两种用法：
   *   a) 简单版：在问题末尾加"请一步步思考"
   *   b) 完整版：在 Few-shot 示例中包含推理步骤
   */
  chain_of_thought: {
    name: 'Chain-of-Thought',
    description: '要求模型展示推理步骤，提升逻辑推理正确率',
    apply(question, style = 'simple') {
      if (style === 'simple') {
        return `${question}\n\n请一步步思考，先写出推理过程，再给出最终答案。`;
      }
      // 完整版：在示例中展示推理过程
      return `请按照"思考过程 → 最终答案"的格式回答问题。
        ${question}
        思考过程：`;
    },
  },

  /**
   * 技巧 4：ReAct（Reasoning + Acting）
   *
   * 💡 原理：让模型交替进行"推理"和"行动"
   * - 这是 Agent 的核心范式！
   * - 推理：分析当前情况，决定下一步做什么
   * - 行动：调用工具、检索知识等
   * - 观察：获取行动结果，回到推理步骤
   *
   * 循环：Thought → Action → Observation → Thought → ...
   */
  react: {
    name: 'ReAct',
    description: '交替推理和行动，Agent 的核心范式',
    apply(question, availableTools = []) {
      const toolDesc = availableTools.length > 0
        ? `\n可用工具: ${availableTools.map(t => t.name).join(', ')}`
        : '\n可用工具: 无（纯推理模式）';

      return `你需要通过交替进行"思考"和"行动"来回答问题。${toolDesc}
        回答格式：
        思考: [分析当前情况，决定下一步]
        行动: [执行的动作，如调用工具]
        问题: ${question}
        思考:`;
    },
  },

  /**
   * 技巧 5：结构化输出
   *
   * 💡 原理：用 JSON Schema 或格式要求约束模型输出
   * - 确保输出可以被程序解析（JSON、Markdown 表格等）
   * - Anthropic API 支持 tool_choice 强制 JSON 输出
   * - 对 API 集成、数据处理场景至关重要
   */
  structured_output: {
    name: '结构化输出',
    description: '约束模型输出为 JSON 等结构化格式',
    apply(question, schema = null) {
      if (schema) {
        return `请严格按照以下 JSON Schema 输出结果，不要输出任何其他内容：
          ${JSON.stringify(schema, null, 2)}
          问题: ${question}
          JSON 输出:`;
      }
      return `请以 JSON 格式回答以下问题，确保输出是合法的 JSON。
        问题: ${question}
        JSON 输出:`;
    },
  },

  /**
   * 技巧 6：角色设定（System Prompt）
   *
   * 💡 原理：通过 System Prompt 定义 AI 的"人格"
   * - 限定专业领域和回答风格
   * - 设置行为规则和边界
   * - 这是所有 Agent 的起点——先定义"你是谁"
   *
   * 💡 System Prompt vs User Prompt 的区别：
   * - System Prompt：全局指令，对整个对话生效
   * - User Prompt：单轮输入，只影响当前回答
   */
  role_setting: {
    name: '角色设定',
    description: '通过 System Prompt 定义 AI 的角色和行为边界',
    apply(role, question) {
      return {
        system: typeof role === 'string' ? role : role.system,
        user: question,
      };
    },
  },
};

/**
 * 💡 便捷方法：根据技巧名称应用 Prompt
 */
export function applyTechnique(name, ...args) {
  const tech = techniques[name];
  if (!tech) throw new Error(`未知技巧: ${name}，可用: ${Object.keys(techniques).join(', ')}`);
  return tech.apply(...args);
}

/**
 * 获取所有技巧名称和描述
 */
export function listTechniques() {
  return Object.entries(techniques).map(([key, tech]) => ({
    key,
    name: tech.name,
    description: tech.description,
  }));
}
