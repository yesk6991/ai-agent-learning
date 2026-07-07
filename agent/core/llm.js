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
 * SSE 流式 LLM 调用接口
 *
 * 专门为 HTTP SSE 场景设计，接收 Node.js ServerResponse 对象，
 * 将 LLM 的流式输出逐事件写入 SSE 响应流。
 *
 * SSE 协议格式：data: <JSON>\n\n
 *
 * 与 streamLLM 的区别：
 *   - streamLLM: async generator，供 for await...of 消费（CLI / 内部调用）
 *   - sseStreamLLM: 直接写 SSE 到 HTTP 响应（Web 服务场景）
 *
 * @param {object} options
 * @param {import('http').ServerResponse} options.res - HTTP 响应对象
 * @param {Array} options.messages - 消息历史
 * @param {Array} options.tools - 工具定义
 * @param {string} options.model - 模型名称
 * @param {number} options.max_tokens - 最大 token 数
 * @param {string} options.system - 系统提示
 * @param {AbortSignal} options.signal - 取消信号
 */
export async function sseStreamLLM({
  res,
  messages,
  tools,
  model = 'claude-sonnet-4-6-20250514',
  max_tokens = 1024,
  system,
  signal,
}) {
  // 设置 SSE 响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // 禁止 Nginx 缓冲
  });

  // 发送一个 SSE 事件
  function send(event) {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // 客户端断开时的清理
  let clientClosed = false;
  const onClose = () => { clientClosed = true; };
  res.on('close', onClose);

  try {
    // 复用 streamLLM 的 async generator，逐 chunk 写入 SSE
    for await (const chunk of streamLLM({ messages, tools, model, max_tokens, system, signal })) {
      if (clientClosed || res.writableEnded) break;
      send(chunk);
    }
  } catch (err) {
    if (!clientClosed && !res.writableEnded) {
      send({ type: 'error', error: { message: err.message } });
    }
  } finally {
    res.removeListener('close', onClose);
    if (!res.writableEnded && !clientClosed) {
      res.end();
    }
  }
}

/**
 * Mock SSE 流式输出
 *
 * 不调用任何 LLM API，纯本地生成模拟文本并逐 token 以 SSE 格式推送。
 * 用于开发调试前端 SSE 消费逻辑，无需 API Key。
 *
 * @param {import('http').ServerResponse} options.res - HTTP 响应对象
 * @param {string} options.prompt - 用户输入（Mock 函数据此生成回复）
 * @param {object} options.options - 可选配置
 * @param {number} options.options.chunkSize - 每次 yield 的字符数（模拟 token 粒度）
 * @param {number} options.options.delay - 每次输出间隔 ms（模拟生成延迟）
 */
export async function mockSSEStream({
  res,
  prompt,
  options: { chunkSize = 2, delay = 30 } = {},
}) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  function send(event) {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  let clientClosed = false;
  const onClose = () => { clientClosed = true; };
  res.on('close', onClose);

  try {
    // 生成模拟回复文本
    const replyText = generateMockReplyText(prompt);

    send({ type: 'message_start', model: 'mock-model' });

    // 逐 chunk 输出文本，模拟流式生成
    for (let i = 0; i < replyText.length; i += chunkSize) {
      if (clientClosed || res.writableEnded) break;

      const chunk = replyText.slice(i, i + chunkSize);
      send({ type: 'text_delta', text: chunk });

      // 让出事件循环，模拟 LLM 生成延迟
      await new Promise(r => setTimeout(r, delay));
    }

    if (!clientClosed && !res.writableEnded) {
      send({
        type: 'done',
        usage: { input_tokens: 20 + prompt.length, output_tokens: replyText.length },
      });
    }
  } catch (err) {
    if (!clientClosed && !res.writableEnded) {
      send({ type: 'error', error: { message: err.message } });
    }
  } finally {
    res.removeListener('close', onClose);
    if (!res.writableEnded && !clientClosed) {
      res.end();
    }
  }
}

/**
 * 根据 prompt 生成模拟回复文本
 * 独立于 generateMockResponse（那个生成 Anthropic 格式，这个生成纯文本）
 */
function generateMockReplyText(prompt) {
  if (prompt.includes('天气')) {
    return '当前北京天气：晴天，温度 28°C，空气质量优。建议出门带好防晒，紫外线较强。';
  }
  if (prompt.includes('计算') || prompt.includes('算')) {
    return '让我帮你计算。根据表达式，计算结果已经得出，详情如下...';
  }
  if (prompt.includes('时间') || prompt.includes('几点')) {
    return `现在是北京时间 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}。有什么其他问题吗？`;
  }
  if (prompt.includes('你好') || prompt.includes('hello') || prompt.includes('hi')) {
    return '你好！我是 AI 助手，有什么可以帮你的？你可以问我天气、时间，或者让我做计算。';
  }
  return `[Mock 模式] 你说的是："${prompt}"。这是一个模拟回复，用于测试 SSE 流式输出效果。在生产环境中，这里会是 AI 模型生成的真实回答，逐 token 流式返回给前端。`;
}

/**
 * 获取当前运行模式
 */
export function getMode() {
  return (hasApiKey && hasFetch) ? 'live' : 'mock';
}

export { hasApiKey, hasFetch };
