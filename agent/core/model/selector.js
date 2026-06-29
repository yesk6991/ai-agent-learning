// 💡 学习要点：智能模型选择器根据任务特征自动推荐最合适的模型
// 核心 trade-off：能力 vs 成本 vs 延迟
//
// 选型逻辑：
// 1. 分析用户输入的任务类型
// 2. 匹配模型的能力画像
// 3. 考虑用户的预算和延迟约束
// 4. 给出推荐 + 理由

import { modelProfiles } from './profiles.js';

/**
 * 任务类型检测
 *
 * 💡 根据输入文本的特征判断任务类型
 * 简化版：用关键词匹配，生产环境可用 LLM 分类
 */
function detectTaskType(input) {
  const text = input.toLowerCase();

  // 简单任务特征
  const simplePatterns = [
    /翻译|translate/i,
    /分类|classify/i,
    /提取|extract/i,
    /格式|format/i,
    /总结|summarize.*(?:一段|短)/i,
    /^.{1,20}$/,  // 很短的输入
  ];

  // 中等任务特征
  const mediumPatterns = [
    /解释|explain/i,
    /写|write|compose/i,
    /分析|analyze/i,
    /实现|implement/i,
    /对话|chat/i,
    /问答|answer/i,
  ];

  // 复杂任务特征
  const complexPatterns = [
    /推理|reasoning|证明/i,
    /规划|plan|策略/i,
    /设计.*架构|architect/i,
    /一步步|step by step/i,
    /优化|optimize/i,
    /审查|review|审计/i,
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(text)) return 'complex';
  }

  for (const pattern of mediumPatterns) {
    if (pattern.test(text)) return 'medium';
  }

  for (const pattern of simplePatterns) {
    if (pattern.test(text)) return 'simple';
  }

  return 'medium'; // 默认中等
}

/**
 * 智能模型选择器
 *
 * 💡 选型策略：
 * - simple → Haiku（省成本，速度够用）
 * - medium → Sonnet（均衡，性价比最高）
 * - complex → Opus（能力最强，不怕慢和贵）
 *
 * 同时考虑用户的显式约束：
 * - budget: 'low' | 'medium' | 'high'
 * - latency: 'fast' | 'normal' | 'slow'
 */
export function selectModel(input, { budget = 'medium', latency = 'normal' } = {}) {
  const taskType = detectTaskType(input);

  // 任务类型 → 模型等级的映射
  const taskToTier = {
    simple: 'fast',
    medium: 'balanced',
    complex: 'powerful',
  };

  let recommendedTier = taskToTier[taskType];

  // 💡 根据约束调整推荐
  // 预算有限 → 降级
  if (budget === 'low' && recommendedTier !== 'fast') {
    recommendedTier = recommendedTier === 'powerful' ? 'balanced' : 'fast';
  }

  // 延迟要求高 → 倾向快模型
  if (latency === 'fast' && recommendedTier === 'powerful') {
    recommendedTier = 'balanced';
  }

  // 找到对应的模型
  const recommended = Object.entries(modelProfiles).find(
    ([, profile]) => profile.tier === recommendedTier
  );

  return {
    taskType,
    recommendedModel: recommended ? recommended[0] : 'claude-sonnet-4-6-20250514',
    recommendedTier,
    reason: generateReason(taskType, recommendedTier, budget, latency),
    alternatives: Object.entries(modelProfiles)
      .filter(([, p]) => p.tier !== recommendedTier)
      .map(([id, p]) => ({ id, name: p.name, tier: p.tier })),
  };
}

/**
 * 生成选型理由
 */
function generateReason(taskType, tier, budget, latency) {
  const taskDesc = {
    simple: '简单任务（分类/提取/翻译等）',
    medium: '中等任务（解释/写作/分析等）',
    complex: '复杂任务（推理/规划/架构设计等）',
  };

  const tierDesc = {
    fast: 'Haiku（快速轻量）',
    balanced: 'Sonnet（均衡）',
    powerful: 'Opus（最强）',
  };

  let reason = `检测到${taskDesc[taskType]}，推荐使用 ${tierDesc[tier]}`;

  if (budget === 'low') reason += '。受预算约束，已选择更经济的方案';
  if (latency === 'fast') reason += '。受延迟约束，已选择更快的方案';

  return reason;
}

/**
 * 对比不同模型在同一任务上的预期表现
 *
 * 💡 这是模型选型的"决策辅助工具"
 * 不实际调用模型，而是基于画像数据做对比
 */
export function compareModels(taskInput) {
  const taskType = detectTaskType(taskInput);

  return Object.entries(modelProfiles).map(([id, profile]) => ({
    id,
    name: profile.name,
    tier: profile.tier,
    // 根据任务类型选对应的能力评分
    relevantScore: profile.capabilities[getRelevantCapability(taskType)],
    costPerCall: estimatePerCallCost(profile),
    latency: profile.latency.typical,
    bestFor: profile.bestFor,
  }));
}

function getRelevantCapability(taskType) {
  const mapping = {
    simple: 'instruction_following',
    medium: 'general',
    complex: 'reasoning',
  };
  return mapping[taskType] || 'general';
}

function estimatePerCallCost(profile) {
  // 假设平均 500 input + 200 output tokens
  const inputCost = (500 * profile.cost.input_per_million) / 1_000_000;
  const outputCost = (200 * profile.cost.output_per_million) / 1_000_000;
  return (inputCost + outputCost).toFixed(4);
}
