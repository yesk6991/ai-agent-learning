// SSE 流式输出服务器
// 运行: node server/sse-server.js
//
// 提供两个端点：
//   POST /chat/stream   — SSE 流式聊天（调用真实 LLM 或自动降级 Mock）
//   POST /chat/mock     — 纯 Mock SSE 流式输出（无需 API Key，始终可用）
//
// 前端页面：http://localhost:3000/

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sseStreamLLM, mockSSEStream } from '../agent/core/llm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// 解析 request body（JSON）
function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// 发送 JSON 响应
function jsonRes(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ── 首页：返回前端 HTML ──
  if (req.method === 'GET' && url.pathname === '/') {
    try {
      const html = await readFile(resolve(__dirname, 'sse-client.html'), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      jsonRes(res, 404, { error: '前端页面未找到' });
    }
    return;
  }

  // ── SSE 流式聊天（自动判断 live/mock 模式） ──
  if (req.method === 'POST' && url.pathname === '/chat/stream') {
    try {
      const body = await parseBody(req);
      const { messages, model, system, tools } = body;

      if (!messages?.length) {
        jsonRes(res, 400, { error: 'messages 不能为空' });
        return;
      }

      await sseStreamLLM({ res, messages, model, system, tools });
    } catch (err) {
      if (!res.writableEnded) {
        jsonRes(res, 500, { error: err.message });
      }
    }
    return;
  }

  // ── Mock SSE 流式输出（始终可用，无需 API Key） ──
  if (req.method === 'POST' && url.pathname === '/chat/mock') {
    try {
      const body = await parseBody(req);
      const { prompt, chunkSize, delay } = body;

      if (!prompt) {
        jsonRes(res, 400, { error: 'prompt 不能为空' });
        return;
      }

      await mockSSEStream({ res, prompt, options: { chunkSize, delay } });
    } catch (err) {
      if (!res.writableEnded) {
        jsonRes(res, 500, { error: err.message });
      }
    }
    return;
  }

  // ── 404 ──
  jsonRes(res, 404, { error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`🚀 SSE 服务器已启动: http://localhost:${PORT}/`);
  console.log(`   POST /chat/stream  — SSE 流式聊天（真实 LLM / 自动降级 Mock）`);
  console.log(`   POST /chat/mock    — 纯 Mock SSE 流式输出`);
});
