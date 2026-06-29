# Node.js 学习计划 — 前端工程师转全栈

## 你的情况

- ✅ 前端熟练（React/TypeScript），JS 基础扎实
- ✅ Node 22.22 + npm 10.9（最新 LTS，支持 ESM、原生 fetch、top-level await）
- ✅ 有 AI Agent 项目经验（已掌握 API 调用、流式输出、工具调用）
- 🔜 Node.js 后端零基础，需要系统学习

## 学习策略：脚本学原理 → 串成项目

分两阶段：
1. **基础篇**：每个知识点一个独立脚本，直接 `node xxx.js` 运行，边看边学
2. **实战篇**：所有知识点串成一个完整的全栈项目——**AI 知识库管理平台后端**

实战项目和现有的 Agent 项目打通：Agent 前端调用这个后端 API，形成完整的前后端闭环。

---

## 项目结构

```
server/
├── basics/                        # 📖 基础篇：分模块独立脚本
│   ├── 01-http.js                 #   原生 HTTP 服务器（理解 Node 本质）
│   ├── 02-express.js              #   Express 入门（路由、中间件、错误处理）
│   ├── 03-middleware.js           #   中间件原理（手写 bodyParser/logger/errorHandler）
│   ├── 04-async.js                #   异步编程（Promise/async/await/错误处理模式）
│   ├── 05-file.js                 #   文件系统（fs/pipeline/大文件上传）
│   ├── 06-sql.js                  #   SQL 基础 + SQLite 入门（零配置数据库）
│   ├── 07-prisma.js               #   Prisma ORM（建模/迁移/CRUD/关联查询）
│   ├── 08-auth.js                 #   JWT 认证（签发/验证/刷新/token 黑名单）
│   ├── 09-rbac.js                 #   RBAC 权限（角色/权限/中间件鉴权）
│   ├── 10-websocket.js            #   WebSocket（实时通信/聊天室）
│   ├── 11-error.js                #   生产级错误处理（全局捕获/分类/日志）
│   └── 12-deploy.js               #   部署实践（PM2/Docker/环境变量/健康检查）
│
├── src/                           # 🏗️ 实战篇：AI 知识库管理平台后端
│   ├── app.js                     #   Express 应用入口
│   ├── config/
│   │   └── index.js               #   配置管理（环境变量/多环境）
│   ├── db/
│   │   └── prisma/                #   Prisma Schema + 迁移
│   │       └── schema.prisma
│   ├── middleware/
│   │   ├── auth.js                #   JWT 认证中间件
│   │   ├── rbac.js                #   RBAC 权限中间件
│   │   ├── validate.js            #   请求校验中间件
│   │   ├── rateLimit.js           #   限流中间件
│   │   └── errorHandler.js        #   全局错误处理
│   ├── router/
│   │   ├── auth.js                #   认证路由（登录/注册/刷新）
│   │   ├── user.js                #   用户管理路由
│   │   ├── knowledge.js           #   知识库 CRUD 路由
│   │   ├── document.js            #   文档管理路由（上传/下载/分块预览）
│   │   └── chat.js                #   AI 对话路由（SSE 流式输出）
│   ├── service/
│   │   ├── auth.js                #   认证业务逻辑
│   │   ├── knowledge.js           #   知识库业务逻辑
│   │   ├── document.js            #   文档处理（分块/向量化）
│   │   └── chat.js                #   AI 对话服务（串联 RAG + Agent）
│   ├── utils/
│   │   ├── logger.js              #   日志工具
│   │   ├── response.js            #   统一响应格式
│   │   └── errors.js              #   自定义错误类
│   └── websocket/
│       └── chat.js                #   WebSocket 聊天（实时对话）
│
├── prisma/
│   └── schema.prisma              #   数据模型定义
├── docker-compose.yml             #   本地开发环境（PostgreSQL + Redis）
├── Dockerfile                     #   生产部署镜像
├── ecosystem.config.js            #   PM2 配置
└── package.json
```

---

## 基础篇：12 个独立脚本详解

### 01 - 原生 HTTP 服务器

**学习目标**：理解 Node.js 的本质——它不是框架，是运行时

```
- http.createServer() 创建服务器
- request/response 对象详解
- URL 路由分发（不用框架，手写路由）
- Node 事件循环与单线程模型
- 💡 对比：Node http vs Express vs Koa，它们分别解决了什么问题
```

### 02 - Express 入门

**学习目标**：掌握最主流的 Node Web 框架

```
- app.get / app.post / app.put / app.delete
- 路由参数 / 查询参数 / 请求体
- 中间件执行顺序（洋葱模型 vs 线性模型）
- express.Router() 模块化路由
- 💡 为什么先学 Express 再看 Koa/Fastify？
```

### 03 - 中间件原理

**学习目标**：理解中间件是 Node 后端的灵魂

```
- 手写 bodyParser（解析 JSON/URL-encoded）
- 手写 logger（请求日志）
- 手写 errorHandler（统一错误捕获）
- next() 的本质：责任链模式
- 💡 Express 线性中间件 vs Koa 洋葱模型，代码对比
```

### 04 - 异步编程

**学习目标**：Node 后端的异步比前端更复杂，错误处理更关键

```
- Promise 链式调用 vs async/await
- 并发控制：Promise.all / Promise.allSettled / Promise.race
- 错误处理：try-catch / catch-all / unhandledRejection
- 💡 前端异步 vs 后端异步的核心区别：前端失败=UI 报错，后端失败=数据损坏
```

### 05 - 文件系统

**学习目标**：Node 后端最常见的 I/O 操作

```
- fs.readFile / fs.writeFile / fs.unlink
- Stream 流：读取大文件不爆内存
- pipeline 管道：连接读写流
- 文件上传：multipart/form-data 解析
- 💡 为什么后端必须用 Stream？Buffer vs Stream 的内存差异
```

### 06 - SQL 基础 + SQLite

**学习目标**：从零理解数据库，SQLite 零配置即开即用

```
- SQL 基础：SELECT / INSERT / UPDATE / DELETE / JOIN
- better-sqlite3 基本操作
- 事务（BEGIN / COMMIT / ROLLBACK）
- 💡 为什么先学 SQL 再学 ORM？不懂 SQL 的话 ORM 就是黑盒
```

### 07 - Prisma ORM

**学习目标**：现代 Node.js 最流行的 ORM

```
- Schema 定义模型（User / Knowledge / Document）
- npx prisma migrate dev 迁移
- CRUD：create / findMany / findUnique / update / delete
- 关联查询：include / select / where 嵌套
- 💡 Prisma vs Sequelize vs TypeORM，为什么选 Prisma？
```

### 08 - JWT 认证

**学习目标**：前后端分离项目的认证标准方案

```
- JWT 结构：Header.Payload.Signature
- jsonwebtoken 签发与验证
- Access Token + Refresh Token 双 token 方案
- Token 黑名单（登出/踢人）
- 💡 JWT vs Session 各自适用场景
```

### 09 - RBAC 权限

**学习目标**：企业级应用的权限模型

```
- 角色（admin / editor / viewer）
- 权限（knowledge:create / document:delete）
- 权限中间件：requireRole('admin')
- 权限与路由绑定
- 💡 RBAC vs ABAC vs ACL
```

### 10 - WebSocket

**学习目标**：实时通信，AI 对话场景必备

```
- ws 库基本使用
- 建立连接 / 消息收发 / 心跳保活
- 广播消息 / 房间概念
- 💡 WebSocket vs SSE vs 长轮询，什么时候选哪个
```

### 11 - 生产级错误处理

**学习目标**：后端不能崩，崩了要能恢复

```
- 全局错误捕获：uncaughtException / unhandledRejection
- 错误分类：业务错误 / 系统错误 / 第三方错误
- 统一错误响应格式
- 错误日志与告警
- 💡 为什么后端错误处理比前端重要 10 倍
```

### 12 - 部署实践

**学习目标**：让 Node 应用稳定跑在生产环境

```
- PM2 进程管理（cluster 模式 / 日志 / 重启）
- Docker 容器化（Dockerfile / docker-compose）
- 环境变量管理（.env / config 模块）
- 健康检查接口（/health）
- 💡 前端部署 vs 后端部署的本质区别
```

---

## 实战篇：AI 知识库管理平台后端

### 功能清单

| 模块 | 功能 | 用到的知识点 |
|------|------|-------------|
| 认证 | 注册/登录/刷新Token/登出 | JWT、bcrypt、中间件 |
| 用户管理 | CRUD、角色分配 | Prisma、RBAC |
| 知识库 | 创建/编辑/删除/列表 | RESTful API、分页、搜索 |
| 文档管理 | 上传/下载/分块预览 | fs/Stream/multipart |
| AI 对话 | SSE 流式问答 | SSE、Agent/RAG 串联 |
| 实时通信 | WebSocket 聊天 | ws、房间广播 |

### 数据模型

```prisma
// User - 用户
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String   // bcrypt 哈希
  name      String
  role      Role     @default(VIEWER) // ADMIN / EDITOR / VIEWER
  createdAt DateTime @default(now())
}

// Knowledge - 知识库
model Knowledge {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  documents   Document[]
  createdBy   Int
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// Document - 文档
model Document {
  id           Int       @id @default(autoincrement())
  title        String
  content      String    // 原始内容
  filePath     String?   // 上传文件路径
  chunks       Chunk[]   // 分块
  knowledgeId  Int
  knowledge    Knowledge @relation(fields: [knowledgeId], references: [id])
  createdBy    Int
  createdAt    DateTime  @default(now())
}

// Chunk - 文档分块
model Chunk {
  id         Int      @id @default(autoincrement())
  content    String   // 分块文本
  chunkIndex Int      // 分块序号
  documentId Int
  document   Document @relation(fields: [documentId], references: [id])
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}
```

### API 设计

```
POST   /api/auth/register        注册
POST   /api/auth/login           登录
POST   /api/auth/refresh         刷新 Token
POST   /api/auth/logout          登出

GET    /api/users                用户列表（ADMIN）
PATCH  /api/users/:id/role       修改角色（ADMIN）

GET    /api/knowledges           知识库列表
POST   /api/knowledges           创建知识库
GET    /api/knowledges/:id       知识库详情
PUT    /api/knowledges/:id       更新知识库
DELETE /api/knowledges/:id       删除知识库

POST   /api/knowledges/:id/documents       上传文档
GET    /api/knowledges/:id/documents       文档列表
GET    /api/documents/:id/chunks           文档分块预览
DELETE /api/documents/:id                  删除文档

POST   /api/chat                  AI 对话（SSE 流式）
WS     /ws/chat                   WebSocket 实时对话

GET    /health                    健康检查
```

### 与 Agent 项目串联

```
┌──────────────────┐     HTTP/SSE/WS      ┌──────────────────┐
│                  │  ──────────────────→  │                  │
│   Agent 前端     │                      │   Node 后端      │
│   (已有项目)     │  ←──────────────────  │   (本项目)       │
│                  │     JSON/Stream       │                  │
└──────────────────┘                       └──────────────────┘
                                                  │
                                          ┌───────┼───────┐
                                          │       │       │
                                        SQLite  RAG模块  AI API
```

- Agent 的 CLI 和 demo 脚本可以调用后端 API
- 知识库数据存到数据库，不再用内存
- 对话走 SSE 流式，体验和直接调 API 一致

---

## 技术选型

| 维度 | 选择 | 理由 |
|------|------|------|
| Web 框架 | Express | 生态最成熟，学习资源最多，面试最常问 |
| 数据库 | SQLite → PostgreSQL | 基础篇用 SQLite 零配置；实战篇用 PG 支持生产级 |
| ORM | Prisma | 类型安全、迁移工具好、文档优秀、面试加分 |
| 认证 | JWT (jsonwebtoken) | 前后端分离标准方案 |
| 日志 | pino | Node 最快的 JSON 日志库 |
| 校验 | zod | TypeScript-first，和前端用同一个库 |
| 进程管理 | PM2 | Node 部署事实标准 |
| 容器化 | Docker + docker-compose | 本地 PG/Redis 一键启动 |

## 实现顺序

1. ✅ 基础篇 01-05（HTTP/Express/中间件/异步/文件系统）
2. ✅ 基础篇 06-07（SQL/Prisma）
3. ✅ 基础篇 08-09（JWT/RBAC）
4. ✅ 基础篇 10-12（WebSocket/错误处理/部署）
5. 🏗️ 实战篇：项目骨架搭建
6. 🏗️ 实战篇：认证模块
7. 🏗️ 实战篇：知识库 + 文档管理
8. 🏗️ 实战篇：AI 对话（SSE + RAG 串联）
9. 🏗️ 实战篇：WebSocket 实时通信
10. 🏗️ 实战篇：部署（Docker + PM2）

## 代码风格

- 每个基础脚本都有 `💡 学习要点` 和 `🔍 对比` 注释
- 每个脚本可直接 `node basics/xx-xxx.js` 运行
- 实战篇采用分层架构：Router → Middleware → Service → Prisma
- 统一响应格式：`{ code, message, data }`
- 错误分类：BusinessError / AuthError / SystemError
