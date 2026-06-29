// 💡 AI 知识库管理平台后端 —— 实战篇入口
// 这个文件串联了基础篇学到的所有知识点：
// Express 路由 + 中间件 + JWT 认证 + RBAC 权限 + 错误处理 + Prisma

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// 💡 配置管理
const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
};

// ============================================================
// 1. Express 应用初始化
// ============================================================
const app = express();

// 全局中间件
app.use(cors());                    // 跨域
app.use(express.json());            // JSON 请求体解析
app.use(express.urlencoded({ extended: true })); // URL-encoded 解析

// ============================================================
// 2. 健康检查
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${Math.round(process.uptime())}s`,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
  });
});

// ============================================================
// 3. API 路由
// ============================================================
// 💡 路由模块化：每个模块一个文件
// 暂时用内联路由，后续拆分到 router/ 目录

// --- 认证路由 ---
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const authRouter = Router();

// 模拟用户数据库（后续替换为 Prisma）
const users = [
  { id: 1, email: 'admin@test.com', name: '管理员', password: bcrypt.hashSync('admin123', 10), role: 'ADMIN' },
  { id: 2, email: 'editor@test.com', name: '编辑者', password: bcrypt.hashSync('editor123', 10), role: 'EDITOR' },
  { id: 3, email: 'viewer@test.com', name: '查看者', password: bcrypt.hashSync('viewer123', 10), role: 'VIEWER' },
];

// 注册
authRouter.post('/register', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'email/name/password 必填' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ code: 'DUPLICATE', message: '邮箱已注册' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, email, name, password: hashedPassword, role: 'VIEWER' };
  users.push(newUser);
  res.status(201).json({ code: 0, message: '注册成功', data: { id: newUser.id, email, name } });
});

// 登录
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ code: 'AUTH_ERROR', message: '邮箱或密码错误' });
  }
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role, type: 'access' },
    config.jwtSecret,
    { expiresIn: '15m' },
  );
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: '7d' },
  );
  res.json({
    code: 0,
    data: { accessToken, refreshToken, user: { id: user.id, name: user.name, role: user.role } },
  });
});

// 刷新 Token
authRouter.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ code: 'AUTH_ERROR', message: '未提供 Refresh Token' });
  }
  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret);
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role || 'VIEWER', type: 'access' },
      config.jwtSecret,
      { expiresIn: '15m' },
    );
    res.json({ code: 0, data: { accessToken: newAccessToken } });
  } catch {
    res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Refresh Token 无效或已过期' });
  }
});

app.use('/api/auth', authRouter);

// --- 认证中间件 ---
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ code: 'AUTH_ERROR', message: '未提供 Token' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Token 已过期' });
    }
    return res.status(401).json({ code: 'AUTH_ERROR', message: 'Token 无效' });
  }
};

// --- RBAC 权限中间件 ---
const ROLES = {
  ADMIN: ['user:list', 'knowledge:create', 'knowledge:update', 'knowledge:delete', 'document:upload', 'document:delete', 'chat:access'],
  EDITOR: ['knowledge:create', 'knowledge:update', 'document:upload', 'document:delete', 'chat:access'],
  VIEWER: ['knowledge:list', 'document:list', 'chat:access'],
};

const requirePermission = (permission) => (req, res, next) => {
  const perms = ROLES[req.user?.role] || [];
  if (!perms.includes(permission)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: '权限不足', required: permission });
  }
  next();
};

// --- 知识库路由 ---
const knowledgeRouter = Router();

const knowledges = [
  { id: 1, name: 'AI 基础知识库', description: 'LLM、Agent、RAG 相关知识', createdById: 1, createdAt: '2024-01-01' },
  { id: 2, name: '前端工程化知识库', description: 'React、Vite、Webpack 相关', createdById: 2, createdAt: '2024-02-01' },
];

knowledgeRouter.get('/', (req, res) => {
  res.json({ code: 0, data: knowledges });
});

knowledgeRouter.post('/', requirePermission('knowledge:create'), (req, res) => {
  const { name, description } = req.body;
  const kb = { id: knowledges.length + 1, name, description, createdById: req.user.userId, createdAt: new Date().toISOString() };
  knowledges.push(kb);
  res.status(201).json({ code: 0, data: kb, message: '创建成功' });
});

knowledgeRouter.get('/:id', (req, res) => {
  const kb = knowledges.find(k => k.id === +req.params.id);
  if (!kb) return res.status(404).json({ code: 'NOT_FOUND', message: '知识库不存在' });
  res.json({ code: 0, data: kb });
});

knowledgeRouter.delete('/:id', requirePermission('knowledge:delete'), (req, res) => {
  const idx = knowledges.findIndex(k => k.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ code: 'NOT_FOUND', message: '知识库不存在' });
  knowledges.splice(idx, 1);
  res.json({ code: 0, message: '删除成功' });
});

app.use('/api/knowledges', authMiddleware, knowledgeRouter);

// --- AI 对话路由（SSE 流式输出）---
const chatRouter = Router();

chatRouter.post('/', (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ code: 'INVALID_INPUT', message: 'message 必填' });

  // 💡 SSE（Server-Sent Events）实现流式输出
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // 模拟流式响应
  const words = `收到你的问题："${message}"。这是一个模拟的 AI 流式回复，配置 API Key 后将调用真实的 LLM 生成回答。`.split('');
  let i = 0;

  const interval = setInterval(() => {
    if (i < words.length) {
      // 💡 SSE 格式：data: 内容\n\n
      res.write(`data: ${JSON.stringify({ content: words[i], done: false })}\n\n`);
      i++;
    } else {
      res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 50);

  // 客户端断开时清理
  req.on('close', () => clearInterval(interval));
});

app.use('/api/chat', authMiddleware, requirePermission('chat:access'), chatRouter);

// ============================================================
// 4. 全局错误处理
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: config.nodeEnv === 'production' ? '服务器内部错误' : err.message,
  });
});

// ============================================================
// 5. 启动服务器
// ============================================================
app.listen(config.port, () => {
  console.log(`\n🚀 AI 知识库后端运行在 http://localhost:${config.port}`);
  console.log(`   环境: ${config.nodeEnv}`);
  console.log('\n📋 API 列表:');
  console.log(`  POST   http://localhost:${config.port}/api/auth/register      注册`);
  console.log(`  POST   http://localhost:${config.port}/api/auth/login         登录`);
  console.log(`  POST   http://localhost:${config.port}/api/auth/refresh       刷新Token`);
  console.log(`  GET    http://localhost:${config.port}/api/knowledges         知识库列表`);
  console.log(`  POST   http://localhost:${config.port}/api/knowledges         创建知识库`);
  console.log(`  DELETE http://localhost:${config.port}/api/knowledges/:id     删除知识库`);
  console.log(`  POST   http://localhost:${config.port}/api/chat              AI对话(SSE)`);
  console.log(`  GET    http://localhost:${config.port}/health                健康检查`);
  console.log('\n🔑 测试账号:');
  console.log('  admin@test.com / admin123   (ADMIN)');
  console.log('  editor@test.com / editor123 (EDITOR)');
  console.log('  viewer@test.com / viewer123 (VIEWER)');
  console.log('\n💡 快速测试:');
  console.log(`  curl -X POST http://localhost:${config.port}/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@test.com","password":"admin123"}'`);
});
