// 💡 学习要点：部署是让代码从开发环境跑到生产环境的过程
// 前端部署 = 静态文件扔到 Nginx（你已经有经验）
// 后端部署 = Node 进程管理 + 数据库 + 环境变量 + 健康检查
//
// 🔍 前端部署 vs 后端部署的本质区别：
// 前端：无状态，打包产物是死的 HTML/CSS/JS
// 后端：有状态，连着数据库，有内存缓存，有定时任务

console.log('='.repeat(60));
console.log('🚀 部署实践');
console.log('='.repeat(60));

// ============================================================
// 1. 环境变量管理
// ============================================================
console.log('\n📌 1. 环境变量\n');

// 💡 不同环境的配置不同，不能硬编码
// 开发环境：本地数据库、调试模式、本地 API
// 生产环境：远程数据库、关闭调试、线上 API

// .env 文件（不提交到 Git）
// DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
// JWT_SECRET=your-secret-key
// PORT=3000
// NODE_ENV=development

// config/index.js 的写法
const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    accessExpire: '15m',
    refreshExpire: '7d',
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
};

console.log('  当前配置:', JSON.stringify(config, null, 2).replace(/\n/g, '\n  '));
console.log('');
console.log('  💡 12-Factor App 原则：所有配置从环境变量读取');
console.log('  💡 .env 文件加入 .gitignore，不要提交敏感信息');

// ============================================================
// 2. PM2 进程管理
// ============================================================
console.log('\n📌 2. PM2 进程管理\n');

console.log('  📋 ecosystem.config.js:');
console.log(`
  export const apps = [{
    name: 'ai-knowledge-server',  // 应用名
    script: 'src/app.js',          // 入口文件
    instances: 'max',              // 💡 Cluster 模式：开满所有 CPU 核心
    exec_mode: 'cluster',          // 💡 单进程 vs Cluster
    env_development: { NODE_ENV: 'development' },
    env_production:  { NODE_ENV: 'production' },
    max_memory_restart: '500M',    // 💡 内存超限自动重启
    error_file: 'logs/error.log',  // 错误日志
    out_file: 'logs/out.log',      // 标准输出日志
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }];
`);

console.log('  📋 常用命令:');
console.log('    pm2 start ecosystem.config.js --env production  # 启动');
console.log('    pm2 list                                        # 查看进程');
console.log('    pm2 logs ai-knowledge-server                    # 查看日志');
console.log('    pm2 restart ai-knowledge-server                 # 重启');
console.log('    pm2 stop ai-knowledge-server                    # 停止');
console.log('    pm2 monit                                       # 实时监控');

console.log('');
console.log('  💡 为什么用 PM2 而不是直接 node app.js？');
console.log('    - 进程崩溃自动重启');
console.log('    - Cluster 模式利用多核');
console.log('    - 日志管理');
console.log('    - 零停机重载（pm2 reload）');

// ============================================================
// 3. Docker 容器化
// ============================================================
console.log('\n📌 3. Docker 容器化\n');

console.log('  📋 Dockerfile:');
console.log(`
  FROM node:22-alpine            # 💡 Alpine 版本，镜像只有 ~50MB
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --production        # 💡 ci 比 install 更可靠，严格按 lock 安装
  COPY . .
  RUN npx prisma generate       # 生成 Prisma 客户端
  EXPOSE 3000
  CMD ["node", "src/app.js"]    # 不用 PM2（Docker 自己管进程）
`);

console.log('  📋 docker-compose.yml（本地开发用）:');
console.log(`
  services:
    app:
      build: .
      ports: ["3000:3000"]
      env_file: .env
      depends_on: [postgres, redis]

    postgres:                     # 💡 本地 PG 数据库
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: ai_knowledge
        POSTGRES_USER: dev
        POSTGRES_PASSWORD: dev123
      ports: ["5432:5432"]
      volumes: [pgdata:/var/lib/postgresql/data]

    redis:                        # 💡 本地 Redis（Token 黑名单/缓存）
      image: redis:7-alpine
      ports: ["6379:6379"]

  volumes:
    pgdata:
`);

console.log('  💡 一条命令启动完整开发环境: docker compose up -d');

// ============================================================
// 4. 健康检查接口
// ============================================================
console.log('\n📌 4. 健康检查\n');

// 💡 生产环境必须有健康检查接口
// Docker/PM2/负载均衡器通过它判断服务是否正常

console.log('  📋 健康检查实现:');
console.log(`
  app.get('/health', async (req, res) => {
    const checks = {
      server: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    };

    // 检查数据库连接
    try {
      await prisma.$queryRaw\`SELECT 1\`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
      return res.status(503).json({ status: 'unhealthy', checks });
    }

    res.json({ status: 'healthy', checks });
  });
`);

// ============================================================
// 5. 前端部署 vs 后端部署对比
// ============================================================
console.log('\n📌 5. 部署对比\n');

console.log('  ┌──────────────┬────────────────────┬────────────────────┐');
console.log('  │              │     前端部署       │     后端部署       │');
console.log('  ├──────────────┼────────────────────┼────────────────────┤');
console.log('  │ 产物         │ 静态 HTML/CSS/JS  │ Node.js 进程      │');
console.log('  │ 服务端       │ Nginx 静态文件     │ Node 应用服务器    │');
console.log('  │ 数据库       │ 无                │ PostgreSQL/Redis   │');
console.log('  │ 状态         │ 无状态             │ 有状态             │');
console.log('  │ 扩容         │ CDN 全球分发       │ 多实例 + 负载均衡  │');
console.log('  │ 回滚         │ mv dist.bak dist  │ PM2 reload / Docker│');
console.log('  │ 崩溃恢复     │ 不存在             │ PM2 自动重启       │');
console.log('  │ 环境变量     │ 构建时注入         │ 运行时读取         │');
console.log('  └──────────────┴────────────────────┴────────────────────┘');

console.log('\n✅ 部署学习完成！');
