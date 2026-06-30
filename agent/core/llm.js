import 'dotenv/config';

// 占位符 Key 检测，自动降级到 Mock 模式
const PLACEHOLDER_PATTERNS = [
  'your-api-key',
  'your_api_key',
  'placeholder',
  'xxx',
  'sk-ant-test',
  'test',
];

function isPlaceholderKey(key) {
  if (!key) return true;
  const lower = key.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(p => lower.includes(p));
}

const hasApiKey = !!process.env.ANTHROPIC_API_KEY && !isPlaceholderKey(process.env.ANTHROPIC_API_KEY);
const hasFetch = typeof globalThis.fetch === 'function';

/**
 * Mock LLM 响应生成器
 * 当没有有效 API Key 时，根据输入生成模拟的 LLM 响应
 */
function generateMockResponse(messages) {
  const lastUserMsg = messages
    .filter(m => m.role === 'user')
    .pop();

  // 判断是否是工具结果回传（Agent Loop 第二轮）
  const isToolResult = Array.isArray(lastUserMsg?.content) &&
    lastUserMsg.content.some(c => c.type === 'tool_result');

  if (isToolResult) {
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
 * 有 API Key → 调用真实 Anthropic API；无 API Key → 返回 Mock 数据
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

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic();

  const params = { model, max_tokens, messages };
  if (tools?.length) params.tools = tools;
  if (system) params.system = system;

  const response = await client.messages.create(params);
  return response;
}

/**
 * 流式 LLM 调用接口 — Async Generator
 *
 * chunk 类型：
 *   { type: 'message_start', message }
 *   { type: 'content_block_start', contentBlock }
 *   { type: 'text_delta', text }
 *   { type: 'tool_input_delta', partialJson }
 *   { type: 'content_block_stop' }
 *   { type: 'tool_call', tool }
 *   { type: 'done', usage, message }
 *   { type: 'error', error }
 *   { type: 'aborted' }
 *
 * 调用方式：
 *   for await (const chunk of streamLLM({...})) { ... }
 */
export async function* streamLLM({
  messages,
  tools,
  model = 'claude-sonnet-4-6-20250514',
  max_tokens = 1024,
  system,
  signal,
}) {
  // ── Mock 模式 ──
  if (!hasApiKey || !hasFetch) {
    if (!hasApiKey) {
      console.log('⚠️  Mock 模式：未检测到 ANTHROPIC_API_KEY，使用模拟数据');
    } else {
      console.log('⚠️  Mock 模式：Node.js 版本不支持 fetch，使用模拟数据');
    }

    const mockResp = generateMockResponse(messages);

    for (const block of mockResp.content) {
      if (signal?.aborted) return;

      if (block.type === 'text') {
        for (let i = 0; i < block.text.length; i += 2) {
          if (signal?.aborted) return;
          yield { type: 'text_delta', text: block.text.slice(i, i + 2) };
          await new Promise(r => setTimeout(r, 15));
        }
      } else if (block.type === 'tool_use') {
        yield { type: 'tool_call', tool: block };
      }
    }

    yield { type: 'done', usage: mockResp.usage };
    return;
  }

  // ── 真实 API 调用 ──
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic();

  const params = { model, max_tokens, messages };
  if (tools?.length) params.tools = tools;
  if (system) params.system = system;

  // 事件队列：stream 回调里不能 yield，用队列 + Promise 做桥梁
  // 回调 enqueue → generator 体内 await + yield
  const eventQueue = [];
  let resolveNext = null;

  function enqueue(event) {
    eventQueue.push(event);
    if (resolveNext) {
      resolveNext();
      resolveNext = null;
    }
  }

  function waitForNext() {
    if (eventQueue.length > 0) return Promise.resolve();
    return new Promise(r => { resolveNext = r; });
  }

  const stream = client.messages.stream(params);

  if (signal) {
    signal.addEventListener('abort', () => {
      stream.abort();
      enqueue({ type: '_abort' });
    }, { once: true });
  }

  stream.on('message_start', (event) => {
    enqueue({ type: 'message_start', message: event.message });
  });

  stream.on('content_block_start', (event) => {
    enqueue({ type: 'content_block_start', contentBlock: event.content_block });
  });

  stream.on('text', (text) => {
    enqueue({ type: 'text_delta', text });
  });

  stream.on('input_json', (partialJson) => {
    enqueue({ type: 'tool_input_delta', partialJson });
  });

  stream.on('content_block_stop', () => {
    enqueue({ type: 'content_block_stop' });
  });

  stream.on('message_stop', () => {
    enqueue({ type: 'message_stop' });
  });

  stream.on('error', (err) => {
    enqueue({ type: '_error', error: err });
  });

  // 从队列中取出事件并 yield
  let streamFinished = false;

  while (!streamFinished) {
    if (eventQueue.length === 0) {
      await waitForNext();
    }

    const batch = eventQueue.splice(0);

    for (const event of batch) {
      switch (event.type) {
        case 'message_start':
          yield { type: 'message_start', message: event.message };
          break;

        case 'content_block_start':
          yield { type: 'content_block_start', contentBlock: event.contentBlock };
          break;

        case 'text_delta':
          yield { type: 'text_delta', text: event.text };
          break;

        case 'tool_input_delta':
          yield { type: 'tool_input_delta', partialJson: event.partialJson };
          break;

        case 'content_block_stop':
          yield { type: 'content_block_stop' };
          break;

        case 'message_stop': {
          const finalMessage = await stream.finalMessage();
          const toolBlocks = finalMessage.content.filter(b => b.type === 'tool_use');
          for (const tool of toolBlocks) {
            yield { type: 'tool_call', tool };
          }
          yield { type: 'done', usage: finalMessage.usage, message: finalMessage };
          streamFinished = true;
          break;
        }

        case '_error': {
          const err = event.error;
          if (err.name === 'APIError') {
            yield {
              type: 'error',
              error: {
                status: err.status,
                message: err.message,
                errorType: err.error?.error?.type,
              },
            };
          } else {
            yield { type: 'error', error: { message: err.message } };
          }
          streamFinished = true;
          break;
        }

        case '_abort':
          yield { type: 'aborted' };
          streamFinished = true;
          break;
      }

      if (signal?.aborted) {
        yield { type: 'aborted' };
        streamFinished = true;
        break;
      }
    }
  }
}

/**
 * 获取当前运行模式
 */
export function getMode() {
  return (hasApiKey && hasFetch) ? 'live' : 'mock';
}

export { hasApiKey, hasFetch };
