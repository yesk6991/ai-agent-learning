// 💡 学习要点：Express 是 Node.js 最主流的 Web 框架
// 它做了三件事：
// 1. 路由：用 app.get/post/put/delete 代替 if-else
// 2. 中间件：用 app.use() 插入通用逻辑（日志/认证/错误处理）
// 3. 封装：req/res 对象加了各种便捷方法
//
// 🔍 对比：
// - 原生 http：5 行代码起步，路由手写 if-else
// - Express：app.get('/users', handler) 一行搞定
// - Koa：更精简，洋葱模型中间件，但生态不如 Express
// - Fastify：性能最好，但学习曲线稍高

import express from 'express';

const app = express();
const PORT = 3020;

// ============================================================
// 1. 基础路由 —— CRUD 操作
// ============================================================
// 💡 RESTful API 设计：
// GET    /users      → 列表
// GET    /users/:id  → 详情
// POST   /users      → 创建
// PUT    /users/:id  → 全量更新
// PATCH  /users/:id  → 部分更新
// DELETE /users/:id  → 删除

// 模拟数据库
let users = [
  { id: 1, name: '张三', email: 'zhangsan@test.com' },
  { id: 2, name: '李四', email: 'lisi@test.com' },
];

// 获取用户列表
app.get('/users', (req, res) => {
  // 💡 查询参数：req.query
  const { page = 1, size = 10, keyword } = req.query;
  let result = users;
  if (keyword) {
    result = users.filter(u => u.name.includes(keyword));
  }
  res.json({ data: result, total: result.length, page: +page, size: +size });
});

// 获取单个用户
app.get('/users/:id', (req, res) => {
  // 💡 路径参数：req.params
  const user = users.find(u => u.id === +req.params.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({ data: user });
});

// 创建用户
app.post('/users', (req, res) => {
  // 💡 请求体：req.body（需要 body-parser 中间件，见下方 app.use(express.json())）
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name 和 email 必填' });
  }
  const newUser = { id: users.length + 1, name, email };
  users.push(newUser);
  res.status(201).json({ data: newUser, message: '创建成功' });
});

// 更新用户
app.put('/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === +req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '用户不存在' });
  }
  users[index] = { ...users[index], ...req.body, id: +req.params.id };
  res.json({ data: users[index], message: '更新成功' });
});

// 删除用户
app.delete('/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === +req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '用户不存在' });
  }
  users.splice(index, 1);
  res.json({ message: '删除成功' });
});

// ============================================================
// 2. 请求体解析 —— Express 内置中间件
// ============================================================
// 💡 必须在路由之前注册，否则 req.body 是 undefined

// 解析 JSON 请求体：Content-Type: application/json
app.use(express.json());

// 解析 URL-encoded 请求体：Content-Type: application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 3. 模块化路由 —— express.Router()
// ============================================================
// 💡 当路由多了，全写在一个文件里太乱
// 用 Router 把相关路由分组，各自独立文件

const knowledgeRouter = express.Router();

knowledgeRouter.get('/', (req, res) => {
  res.json({ data: [{ id: 1, name: 'AI 基础知识库' }], message: '知识库列表' });
});

knowledgeRouter.post('/', (req, res) => {
  res.status(201).json({ data: req.body, message: '知识库创建成功' });
});

knowledgeRouter.get('/:id', (req, res) => {
  res.json({ data: { id: +req.params.id, name: `知识库${req.params.id}` } });
});

// 💡 挂载路由：所有 /knowledges 开头的请求走 knowledgeRouter
app.use('/knowledges', knowledgeRouter);

// ============================================================
// 4. 静态文件服务
// ============================================================
// 💡 前端部署时经常用到：把 build 产物放到 Express 服务
app.use('/static', express.static('public')); // 虚拟目录，实际不存在也没关系

// ============================================================
// 5. 错误处理
// ============================================================
// 💡 Express 的错误处理中间件：4 个参数（err, req, res, next）
app.use((err, req, res, next) => {
  console.error('❌ 未捕获错误:', err.message);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Express 服务器运行在 http://localhost:${PORT}`);
  console.log('\n📋 可用接口:');
  console.log(`  GET    http://localhost:${PORT}/users           用户列表`);
  console.log(`  GET    http://localhost:${PORT}/users/1         用户详情`);
  console.log(`  POST   http://localhost:${PORT}/users           创建用户`);
  console.log(`  PUT    http://localhost:${PORT}/users/1         更新用户`);
  console.log(`  DELETE http://localhost:${PORT}/users/1         删除用户`);
  console.log(`  GET    http://localhost:${PORT}/knowledges      知识库列表`);
  console.log('\n💡 测试命令:');
  console.log(`  curl http://localhost:${PORT}/users`);
  console.log(`  curl http://localhost:${PORT}/users?keyword=张`);
  console.log(`  curl -X POST http://localhost:${PORT}/users -H "Content-Type: application/json" -d '{"name":"王五","email":"wangwu@test.com"}'`);
});
