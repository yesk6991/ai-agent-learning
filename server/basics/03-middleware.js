// 💡 学习要点：中间件是 Node.js 后端的灵魂
// Express 的一切都是中间件：路由是中间件，body-parser 是中间件，错误处理也是中间件
//
// 🔍 核心概念：
// - 中间件是一个函数：(req, res, next) => { ... }
// - next() 调用后，请求传给下一个中间件
// - 不调 next()，请求就停在这里（用来拦截/提前返回）
// - 中间件按注册顺序执行——顺序很重要！

import express from 'express';

const app = express();
const PORT = 3030;

// ============================================================
// 1. 手写 Logger 中间件
// ============================================================
// 💡 每个请求都记录：方法、路径、状态码、耗时
const logger = (req, res, next) => {
  const start = Date.now();

  // 💡 res.on('finish') 在响应发送后触发
  // 这样可以拿到最终的状态码
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📝 ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });

  next(); // 传给下一个中间件
};

app.use(logger);

// ============================================================
// 2. 手写 BodyParser 中间件
// ============================================================
// 💡 Express 的 express.json() 内部就是这个原理
// 从 req 读取原始数据，解析后挂到 req.body 上

const bodyParser = (req, res, next) => {
  // 只处理 POST/PUT/PATCH 等有请求体的方法
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    let body = '';

    // 💡 req 是可读流，通过 'data' 事件分块接收
    req.on('data', chunk => {
      body += chunk;
    });

    // 💡 'end' 事件表示数据接收完毕
    req.on('end', () => {
      try {
        // 尝试解析 JSON
        if (req.headers['content-type']?.includes('application/json')) {
          req.body = JSON.parse(body);
        } else {
          req.body = body;
        }
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
};

app.use(bodyParser);

// ============================================================
// 3. 手写 CORS 中间件
// ============================================================
// 💡 前后端分离项目必须处理跨域
// CORS 的本质就是给响应加几个 HTTP 头

const cors = (req, res, next) => {
  // 允许的源（生产环境应改为具体域名）
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 允许的方法
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  // 允许的请求头
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // 预检请求缓存时间
  res.setHeader('Access-Control-Max-Age', '86400');

  // 💡 OPTIONS 预检请求：浏览器跨域时先发 OPTIONS 探路
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // 直接返回，不需要业务逻辑
  }

  next();
};

app.use(cors);

// ============================================================
// 4. 手写 Auth 中间件（JWT 验证模拟）
// ============================================================
// 💡 这是最经典的中间件用法：在路由前拦截，验证通过才放行

const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: '未提供认证 Token' });
  }

  // 💡 这里简化验证，实际项目用 jsonwebtoken 库
  if (token === 'valid-token-123') {
    req.user = { id: 1, name: '张三', role: 'admin' }; // 把用户信息挂到 req 上
    next(); // 验证通过，放行
  } else {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
};

// ============================================================
// 5. 中间件的执行顺序 —— 这是最重要的概念
// ============================================================

// ① 全局中间件：所有请求都经过
app.use((req, res, next) => {
  console.log(`  ⬇️  全局中间件1: ${req.method} ${req.url}`);
  next();
});

app.use((req, res, next) => {
  console.log(`  ⬇️  全局中间件2: 请求进入业务逻辑`);
  next();
});

// ② 公开路由：不需要认证
app.get('/public', (req, res) => {
  res.json({ message: '这是公开接口，不需要登录' });
});

// ③ 认证中间件：只对下面的路由生效
app.use('/api', auth);

// ④ 需要认证的路由
app.get('/api/profile', (req, res) => {
  // 💡 auth 中间件已经把用户信息挂到了 req.user
  res.json({ data: req.user, message: '这是需要登录才能访问的接口' });
});

app.get('/api/data', (req, res) => {
  res.json({ data: [1, 2, 3], user: req.user?.name });
});

// ============================================================
// 6. Express vs Koa 中间件模型对比
// ============================================================
// 💡 Express：线性模型（A → B → C → 响应）
//   请求进来，中间件按顺序执行，next() 往下传
//   没有回头路——next() 后面不能再操作响应
//
// 💡 Koa：洋葱模型（A → B → C → B' → A'）
//   next() 返回 Promise，await next() 后还能执行逻辑
//   适合在请求前后都做事情（如计算耗时）
//
// 伪代码对比：
//
// Express（线性）：
//   app.use((req, res, next) => {
//     console.log('请求前');
//     next();
//     // 💡 next() 之后无法修改响应，因为响应已经发送了
//   });
//
// Koa（洋葱）：
//   app.use(async (ctx, next) => {
//     console.log('请求前');
//     await next();
//     // 💡 await next() 之后还可以修改响应
//     console.log('请求后');
//     ctx.set('X-Response-Time', duration);
//   });

// ============================================================
// 7. 手写错误处理中间件
// ============================================================
// 💡 4 个参数的中间件就是错误处理中间件
// 前面的中间件/路由抛错时，Express 会跳过普通中间件，直接找错误处理中间件

// 制造一个会报错的路由
app.get('/error', (req, res) => {
  throw new Error('故意抛出的错误！');
});

// 💡 错误处理中间件必须注册在所有路由之后
app.use((err, req, res, next) => {
  console.error('❌ 错误:', err.message);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message,
    // 生产环境不应暴露错误堆栈
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// 启动
app.listen(PORT, () => {
  console.log(`🔧 中间件演示服务器运行在 http://localhost:${PORT}`);
  console.log('\n📋 测试:');
  console.log(`  curl http://localhost:${PORT}/public                    （公开接口）`);
  console.log(`  curl http://localhost:${PORT}/api/profile                （无 Token → 401）`);
  console.log(`  curl -H "Authorization: Bearer valid-token-123" http://localhost:${PORT}/api/profile  （有 Token → 200）`);
  console.log(`  curl http://localhost:${PORT}/error                     （错误处理）`);
});
