// 💡 学习要点：在 Agent 开发中，Mock 模式非常重要
// - 开发阶段无需真实 API 调用，节省成本
// - 可以模拟各种边界情况（超时、错误、空结果）
// - 让项目在没有 API Key 时也能运行和学习

import 'dotenv/config';

// 检查是否有可用的 API Key
// 💡 还需要检查 Node.js 是否支持 fetch（Anthropic SDK 需要）
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
const hasFetch = typeof globalThis.fetch === 'function';

/**
 * Mock LLM 响应生成器
 * 当没有 API Key 时，根据输入生成模拟的 LLM 响应
 * 这让你无需 Key 也能学习 Agent 的完整流程
 */
function generateMockResponse(messages) {
  const lastUserMsg = messages
    .filter(m => m.role === 'user')
    .pop();

  // 💡 判断是否是工具结果回传（Agent Loop 第二轮）
  // 工具结果的 content 是数组，包含 type: 'tool_result'
  const isToolResult = Array.isArray(lastUserMsg?.content) &&
    lastUserMsg.content.some(c => c.type === 'tool_result');

  if (isToolResult) {
    // 工具结果回传 → 生成最终文本回复
    const toolResults = lastUserMsg.content.filter(c => c.type === 'tool_result');
    const results = toolResults.map(r => r.content).join('; ');
    return {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: `[Mock 模式] 根据工具查询结果：${results}\n\n配置 API Key 后将获得 AI 生成的自然语言回复。当前 Agent 流程已完整走通！`,
        },
      ],
      usage: { input_tokens: 80, output_tokens: 40 },
      model: 'mock-model',
    };
  }

  const content = typeof lastUserMsg?.content === 'string'
    ? lastUserMsg.content
    : JSON.stringify(lastUserMsg?.content);

  // 模拟不同场景的回复
  if (content?.includes('天气')) {
    return {
      role: 'assistant',
      content: [
        { type: 'text', text: '让我帮你查询天气信息。' },
        {
          type: 'tool_use',
          id: 'toolu_mock_001',
          name: 'get_weather',
          input: { city: '北京' },
        },
      ],
      usage: { input_tokens: 50, output_tokens: 30 },
      model: 'mock-model',
    };
  }

  if (content?.includes('计算') || content?.includes('算')) {
    const numMatch = content.match(/(\d+)\s*[\+\-\*\/]\s*(\d+)/);
    if (numMatch) {
      return {
        role: 'assistant',
        content: [
          { type: 'text', text: '让我来计算一下。' },
          {
            type: 'tool_use',
            id: 'toolu_mock_002',
            name: 'calculator',
            input: { expression: content.match(/[\d\+\-\*\/\(\)\s\.]+/)?.[0]?.trim() || '1+1' },
          },
        ],
        usage: { input_tokens: 45, output_tokens: 25 },
        model: 'mock-model',
      };
    }
  }

  if (content?.includes('时间') || content?.includes('几点')) {
    return {
      role: 'assistant',
      content: [
        { type: 'text', text: '让我查看当前时间。' },
        {
          type: 'tool_use',
          id: 'toolu_mock_003',
          name: 'get_time',
          input: {},
        },
      ],
      usage: { input_tokens: 40, output_tokens: 20 },
      model: 'mock-model',
    };
  }

  // 默认回复
  return {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: `[Mock 模式] 我收到了你的问题："${content?.slice(0, 50) || '空消息'}..."。\n\n目前处于模拟模式，无法调用真实 AI 模型。请配置 ANTHROPIC_API_KEY 以获得真实体验。\n\n你的 Agent 流程已经可以正常运转了！`,
      },
    ],
    usage: { input_tokens: 30, output_tokens: 60 },
    model: 'mock-model',
  };
}

/**
 * 统一的 LLM 调用接口
 * - 有 API Key → 调用真实 Anthropic API
 * - 无 API Key → 返回 Mock 数据
 *
 * 💡 这是"适配器模式"的经典应用：
 *   通过统一接口屏蔽底层差异，让上层代码无需关心真实/Mock
 */
export async function callLLM({ messages, tools, model = 'claude-sonnet-4-6-20250514', max_tokens = 1024, system }) {
  if (!hasApiKey || !hasFetch) {
    if (!hasApiKey) {
      console.log('⚠️  Mock 模式：未检测到 ANTHROPIC_API_KEY，使用模拟数据');
    } else {
      console.log('⚠️  Mock 模式：Node.js 版本不支持 fetch，使用模拟数据');
    }
    return generateMockResponse(messages);
  }

  // 真实 API 调用
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic();

  const params = {
    model,
    max_tokens,
    messages,
  };

  if (tools?.length) params.tools = tools;
  if (system) params.system = system;

  const response = await client.messages.create(params);
  return response;
}

/**
 * 流式 LLM 调用接口
 */
export async function streamLLM({ messages, tools, model = 'claude-sonnet-4-6-20250514', max_tokens = 1024, system, onText }) {
  if (!hasApiKey || !hasFetch) {
    const mockResp = generateMockResponse(messages);
    const text = mockResp.content.find(c => c.type === 'text')?.text || '';
    // 模拟流式输出
    for (const char of text) {
      onText?.(char);
      await new Promise(r => setTimeout(r, 20));
    }
    return mockResp;
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic();

  const params = {
    model,
    max_tokens,
    messages,
  };

  if (tools?.length) params.tools = tools;
  if (system) params.system = system;

  const stream = client.messages.stream(params);
  stream.on('text', (text) => onText?.(text));
  return await stream.finalMessage();
}

/**
 * 获取当前运行模式
 */
export function getMode() {
  return (hasApiKey && hasFetch) ? 'live' : 'mock';
}

export { hasApiKey, hasFetch };
