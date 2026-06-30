// 💡 学习要点：在 Agent 开发中，Mock 模式非常重要
// - 开发阶段无需真实 API 调用，节省成本
// - 可以模拟各种边界情况（超时、错误、空结果）
// - 让项目在没有 API Key 时也能运行和学习

import 'dotenv/config';

// 检查是否有可用的 API Key
// 💡 还需要检查 Node.js 是否支持 fetch（Anthropic SDK 需要）
// 💡 占位符 Key（如 your-api-key-here）不算有效，自动降级到 Mock 模式
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
 * 流式 LLM 调用接口 — Async Generator 版本
 *
 * 💡 生产场景的核心要点：
 *   1. 使用 async function* 逐 chunk yield，调用方可以 for await...of 实时消费
 *   2. 监听所有关键事件：text / input_json / content_block_start/stop / message_start/stop
 *   3. 支持 AbortController.signal 取消流式输出
 *   4. 错误处理：stream.on('error') 捕获异常并通过 yield 传递
 *
 * ⚠️ 之前的写法问题：
 *   - 只监听 text 事件，丢失了 tool_use 的 input_json 增量
 *   - 最终 await finalMessage() 等完整结果，等于"带进度条的同步调用"
 *   - 没有错误处理和取消控制
 *
 * 调用方式：
 *   for await (const chunk of streamLLM({...})) {
 *     switch (chunk.type) {
 *       case 'text_delta':       process.stdout.write(chunk.text); break;
 *       case 'tool_input_delta': // 拼接 tool input JSON; break;
 *       case 'tool_call':        // 完整的 tool_use 块; break;
 *       case 'done':             console.log('Usage:', chunk.usage); break;
 *     }
 *   }
 */
export async function* streamLLM({
  messages,
  tools,
  model = 'claude-sonnet-4-6-20250514',
  max_tokens = 1024,
  system,
  signal, // AbortController.signal — 支持取消流式输出
}) {
  // ── Mock 模式 ──────────────────────────────────────────
  if (!hasApiKey || !hasFetch) {
    if (!hasApiKey) {
      console.log('⚠️  Mock 模式：未检测到 ANTHROPIC_API_KEY，使用模拟数据');
    } else {
      console.log('⚠️  Mock 模式：Node.js 版本不支持 fetch，使用模拟数据');
    }

    const mockResp = generateMockResponse(messages);

    // 逐内容块 yield，模拟真实的流式输出
    for (const block of mockResp.content) {
      // 💡 检查是否被取消
      if (signal?.aborted) return;

      if (block.type === 'text') {
        // 模拟逐 token 输出（每次 yield 1-3 个字符）
        for (let i = 0; i < block.text.length; i += 2) {
          if (signal?.aborted) return;
          yield { type: 'text_delta', text: block.text.slice(i, i + 2) };
          // 让出事件循环，让调用方能实时处理
          await new Promise(r => setTimeout(r, 15));
        }
      } else if (block.type === 'tool_use') {
        // tool_use 块一次性 yield（Mock 模式无需模拟 JSON 增量）
        yield { type: 'tool_call', tool: block };
      }
    }

    yield { type: 'done', usage: mockResp.usage };
    return;
  }

  // ── 真实 API 调用 ──────────────────────────────────────
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic();

  const params = { model, max_tokens, messages };
  if (tools?.length) params.tools = tools;
  if (system) params.system = system;

  // 💡 核心技巧：用队列 + Promise 把 stream 事件"搬回" generator 体内 yield
  // 回调函数里不能使用 yield（它不属于 generator 作用域）
  // 所以我们用事件队列做桥梁：回调 push → generator 体内 await + yield
  const eventQueue = [];
  let resolveNext = null;

  function enqueue(event) {
    eventQueue.push(event);
    // 如果 generator 正在等待下一个事件，唤醒它
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

  // 💡 如果传了 signal，绑定取消逻辑
  if (signal) {
    signal.addEventListener('abort', () => {
      stream.abort();
      enqueue({ type: '_abort' });
    }, { once: true });
  }

  // 1️⃣ message_start — 包含 message id、model 信息（可用于日志追踪）
  stream.on('message_start', (event) => {
    // event.message 包含 id / model / usage 等元信息
    enqueue({ type: 'message_start', message: event.message });
  });

  // 2️⃣ content_block_start — 新内容块开始（text 或 tool_use）
  stream.on('content_block_start', (event) => {
    // event.content_block = { type: 'text', text: '' }
    //                     或 { type: 'tool_use', id, name, input: {} }
    enqueue({ type: 'content_block_start', contentBlock: event.content_block });
  });

  // 3️⃣ 逐 token 文本输出 — 核心的流式输出
  stream.on('text', (text) => {
    enqueue({ type: 'text_delta', text });
  });

  // 4️⃣ tool_use 的 input JSON 逐片段到达
  //    💡 这在之前的写法中被完全忽略了！
  //    当 LLM 决定调用工具时，参数 JSON 是逐 chunk 生成的
  stream.on('input_json', (partialJson) => {
    enqueue({ type: 'tool_input_delta', partialJson });
  });

  // 5️⃣ content_block_stop — 一个内容块结束
  stream.on('content_block_stop', () => {
    enqueue({ type: 'content_block_stop' });
  });

  // 6️⃣ message_stop — 整个消息结束
  stream.on('message_stop', () => {
    enqueue({ type: 'message_stop' });
  });

  // 7️⃣ 错误处理
  stream.on('error', (err) => {
    enqueue({ type: '_error', error: err });
  });

  // ── 从队列中逐个取出事件并 yield ──────────────────────
  let streamFinished = false;

  while (!streamFinished) {
    // 💡 如果队列空，等待事件到达
    if (eventQueue.length === 0) {
      await waitForNext();
    }

    // 批量取出当前队列中所有事件（避免逐个 await 导致延迟）
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
          // ✅ 真正在 generator 体内 yield，调用方能实时消费
          yield { type: 'text_delta', text: event.text };
          break;

        case 'tool_input_delta':
          // ✅ tool_use 的 input JSON 增量
          yield { type: 'tool_input_delta', partialJson: event.partialJson };
          break;

        case 'content_block_stop':
          yield { type: 'content_block_stop' };
          break;

        case 'message_stop': {
          // 💡 流结束，拿到完整 message（含 usage 和所有 content blocks）
          const finalMessage = await stream.finalMessage();

          // 从完整消息中提取所有 tool_use 块
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
