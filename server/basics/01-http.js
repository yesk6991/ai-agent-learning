// 💡 学习要点：Node.js 的本质
// Node.js 不是框架，不是语言，而是一个 JavaScript 运行时
// 它让 JS 可以脱离浏览器运行，直接操作文件系统、网络、进程等
//
// 🔍 对比：
// - 浏览器 JS：操作 DOM/BOM，受沙箱限制，无法访问文件系统
// - Node.js JS：操作 fs/http/os/child_process，没有 DOM，可以做后端

import { createServer } from 'http';

// ============================================================
// 1. 最简 HTTP 服务器 —— 5 行代码跑起来
// ============================================================
// 💡 这就是 Node.js 的"Hello World"
// createServer 接收一个回调函数，每次有请求进来就调用
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('你好，这是原生 Node.js HTTP 服务器！\n');
});

server.listen(3000, () => {
  console.log('🚀 原生 HTTP 服务器运行在 http://localhost:3000');
});

// ============================================================
// 2. 手写路由 —— 不用框架也能做路由
// ============================================================
// 💡 Express 做的事情本质上就是这个：根据 URL 和方法分发请求
const routerServer = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { method } = req;

  // 路由匹配
  if (method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: '首页', endpoints: ['/users', '/users/:id'] }));
  }
  else if (method === 'GET' && url.pathname === '/users') {
    // 💡 查询参数：?page=1&size=10
    const page = url.searchParams.get('page') || '1';
    const size = url.searchParams.get('size') || '10';
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      data: [{ id: 1, name: '张三' }, { id: 2, name: '李四' }],
      page: Number(page),
      size: Number(size),
    }));
  }
  else if (method === 'GET' && url.pathname.startsWith('/users/')) {
    // 💡 路径参数：/users/123 → 提取 123
    const id = url.pathname.split('/').pop();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ id: Number(id), name: `用户${id}` }));
  }
  else if (method === 'POST' && url.pathname === '/users') {
    // 💡 请求体读取：POST 数据需要手动收集
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const data = JSON.parse(body || '{}');
      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: '创建成功', data }));
    });
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

routerServer.listen(3001, () => {
  console.log('🛣️  路由服务器运行在 http://localhost:3001');
  console.log('   试试: curl http://localhost:3001/users');
  console.log('   试试: curl http://localhost:3001/users/42');
  console.log('   试试: curl -X POST http://localhost:3001/users -d \'{"name":"王五"}\' -H "Content-Type: application/json"');
});

// ============================================================
// 3. Node.js 事件循环 —— 理解单线程如何处理并发
// ============================================================
// 💡 核心概念：
// - Node.js 是单线程的，但不是"一次只能做一件事"
// - 它通过事件循环（Event Loop）实现非阻塞 I/O
// - 当 I/O 操作（网络请求、文件读取）发起时，Node 不会等待结果，
//   而是注册一个回调，继续处理其他请求
// - I/O 完成后，回调被放入队列，事件循环在合适时机执行
//
// 🔍 类比：
// - 同步阻塞 = 排队等餐，前面的人没拿到你不点单
// - 异步非阻塞 = 拿号等餐，先点单再等叫号，期间可以做别的事

console.log('\n📊 事件循环演示:');
console.log('1. 同步代码（立即执行）');

setTimeout(() => console.log('3. setTimeout 0ms（宏任务）'), 0);

Promise.resolve().then(() => console.log('2. Promise.resolve（微任务）'));

console.log('1. 同步代码（继续执行）');

// 💡 执行顺序：同步 → 微任务(Promise) → 宏任务(setTimeout)
// 输出：
// 1. 同步代码（立即执行）
// 1. 同步代码（继续执行）
// 2. Promise.resolve（微任务）
// 3. setTimeout 0ms（宏任务）

// ============================================================
// 4. 为什么需要 Express？
// ============================================================
// 💡 上面的手写路由已经暴露了问题：
// - if-else 路由匹配太丑，路径多了维护困难
// - 请求体需要手动收集和解析（JSON/URL-encoded/multipart）
// - 没有统一的错误处理
// - 没有中间件机制（日志、认证等需要重复写）
// - 没有 CORS、静态文件服务、Cookie 解析等常用功能
//
// Express 就是把这些通用能力封装好了，让你专注写业务
// 下一个脚本我们就学 Express

console.log('\n💡 思考：手写路由的痛点，就是 Express 要解决的问题');
console.log('   运行 npm run basics:02 学习 Express\n');
