// 💡 学习要点：这是 Agent 的核心引擎 —— Agent Loop
// Agent 不是简单的"一问一答"，而是一个循环：
// 1. 用户提问
// 2. 模型决定是否需要调用工具
// 3. 如果需要，执行工具，把结果回传给模型
// 4. 模型根据结果生成最终回答（或决定继续调用工具）
// 5. 循环直到模型不再调用工具为止

import { callLLM } from '../llm.js';
import { registry } from './registry.js';

/**
 * Agent 执行器
 *
 * 💡 核心概念：Agent Loop（智能体循环）
 *
 * 传统的 API 调用是单向的：
 *   User → LLM → Response
 *
 * Agent 是循环的：
 *   User → LLM → Tool Call → Execute → LLM → Tool Call → ... → Final Response
 *
 * 这个循环让 Agent 具备了"自主行动"的能力！
 */

/**
 * 最大循环次数，防止无限循环
 * 💡 安全措施：Agent 可能在某些情况下反复调用工具
 * 设置最大循环次数是必要的防护
 */
const MAX_ITERATIONS = 5;

/**
 * 运行 Agent 循环
 *
 * @param {object} options
 * @param {string} options.userMessage - 用户输入
 * @param {string} options.system - 系统提示
 * @param {string} options.model - 模型名称
 * @param {object} options.skillRegistry - 技能注册中心
 * @param {function} options.onToolCall - 工具调用回调（用于展示）
 * @param {function} options.onToolResult - 工具结果回调
 * @returns {object} 最终回答和执行统计
 */
export async function runAgentLoop({
  userMessage,
  system,
  model = 'claude-sonnet-4-6-20250514',
  skillRegistry = registry,
  onToolCall,
  onToolResult,
}) {
  const messages = [
    { role: 'user', content: userMessage },
  ];

  const tools = skillRegistry.getSchemas();
  const stats = {
    iterations: 0,
    toolCalls: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    stats.iterations = iteration;

    // 💡 调用 LLM，带上工具定义
    const response = await callLLM({
      messages,
      tools: tools.length > 0 ? tools : undefined,
      model,
      system,
    });

    // 统计 Token 使用
    stats.totalInputTokens += response.usage?.input_tokens || 0;
    stats.totalOutputTokens += response.usage?.output_tokens || 0;

    // 检查模型是否要调用工具
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    const textBlocks = response.content.filter(b => b.type === 'text');

    // 💡 如果没有工具调用，说明模型已经准备好回答了
    if (toolUseBlocks.length === 0) {
      return {
        text: textBlocks.map(b => b.text).join(''),
        stats,
      };
    }

    // 💡 模型要调用工具！执行每个工具调用
    onToolCall?.(toolUseBlocks);

    const toolResults = [];
    for (const toolBlock of toolUseBlocks) {
      stats.toolCalls.push({
        name: toolBlock.name,
        input: toolBlock.input,
      });

      // 执行工具
      const result = await skillRegistry.execute(toolBlock.name, toolBlock.input);
      onToolResult?.(toolBlock.name, result);

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: result,
      });
    }

    // 💡 关键步骤：把模型的回复和工具结果都加入消息历史
    // 这是 Anthropic API 要求的消息格式：
    // 1. assistant 的完整 content（包含 text 和 tool_use）
    // 2. user 角色发送 tool_result
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    // 继续循环，让模型根据工具结果生成回答
  }

  // 如果循环超过最大次数，返回最后的文本
  return {
    text: 'Agent 执行达到最大循环次数，请简化问题或减少工具调用。',
    stats,
  };
}
