// 💡 学习要点：模型选型是 AI 工程化中的关键决策
// 不是所有任务都需要最强的模型——过度使用 = 浪费成本
// 选型三要素：能力、成本、延迟，根据任务特点做取舍
//
// 决策树思路：
// 简单任务 (分类/提取/翻译) → Haiku（快+便宜）
// 中等任务 (对话/写作/分析) → Sonnet（均衡）
// 复杂任务 (推理/规划/创作) → Opus（最强但慢+贵）

/**
 * 模型画像数据库
 *
 * 💡 每个模型从三个维度评估：
 * - capability: 能力评分 1-10
 * - cost: 每百万 Token 成本（美元）
 * - latency: 典型响应延迟（秒）
 */
export const modelProfiles = {
  'claude-haiku-4-5-20251001': {
    name: 'Claude Haiku 4.5',
    tier: 'fast',
    description: '快速轻量模型，适合简单任务',
    capabilities: {
      general: 6,
      reasoning: 5,
      coding: 6,
      creative: 5,
      instruction_following: 7,
    },
    cost: {
      input_per_million: 0.80,   // $/M tokens
      output_per_million: 4.00,
    },
    latency: {
      typical: 0.5,  // 首个 Token 延迟（秒）
    },
    contextWindow: 200000,
    bestFor: ['分类', '提取', '翻译', '简单问答', '格式转换', '批量处理'],
  },

  'claude-sonnet-4-6-20250514': {
    name: 'Claude Sonnet 4.6',
    tier: 'balanced',
    description: '均衡模型，适合大多数任务',
    capabilities: {
      general: 8,
      reasoning: 8,
      coding: 9,
      creative: 8,
      instruction_following: 9,
    },
    cost: {
      input_per_million: 3.00,
      output_per_million: 15.00,
    },
    latency: {
      typical: 1.0,
    },
    contextWindow: 200000,
    bestFor: ['对话', '写作', '分析', '代码生成', 'Agent', 'RAG'],
  },

  'claude-opus-4-8': {
    name: 'Claude Opus 4.8',
    tier: 'powerful',
    description: '最强模型，适合复杂推理和创作',
    capabilities: {
      general: 10,
      reasoning: 10,
      coding: 10,
      creative: 10,
      instruction_following: 10,
    },
    cost: {
      input_per_million: 15.00,
      output_per_million: 75.00,
    },
    latency: {
      typical: 3.0,
    },
    contextWindow: 200000,
    bestFor: ['复杂推理', '规划', '高级创作', '代码审查', '难题求解'],
  },
};

/**
 * 获取模型列表
 */
export function listModels() {
  return Object.entries(modelProfiles).map(([id, profile]) => ({
    id,
    name: profile.name,
    tier: profile.tier,
    description: profile.description,
    bestFor: profile.bestFor,
  }));
}

/**
 * 估算单次调用的成本
 *
 * 💡 成本 = (input_tokens × input_price + output_tokens × output_price) / 1,000,000
 * 这是 LLM 应用成本控制的基础
 */
export function estimateCost(modelId, inputTokens, outputTokens) {
  const profile = modelProfiles[modelId];
  if (!profile) return null;

  const inputCost = (inputTokens * profile.cost.input_per_million) / 1_000_000;
  const outputCost = (outputTokens * profile.cost.output_per_million) / 1_000_000;

  return {
    inputCost: inputCost.toFixed(6),
    outputCost: outputCost.toFixed(6),
    totalCost: (inputCost + outputCost).toFixed(6),
    currency: 'USD',
  };
}
