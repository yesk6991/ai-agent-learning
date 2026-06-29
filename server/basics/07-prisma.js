// 💡 学习要点：Prisma 是现代 Node.js 最流行的 ORM
// ORM = Object-Relational Mapping（对象关系映射）
// 用 JS 对象操作数据库，不用手写 SQL
//
// 🔍 为什么先学 SQL 再学 ORM？
// - ORM 生成的 SQL 你看不懂就无法优化
// - 出了 Bug 不知道是 ORM 的问题还是 SQL 的问题
// - 面试一定问你 SQL，不会只问 ORM
//
// 🔍 Prisma vs Sequelize vs TypeORM
// - Prisma：类型安全、迁移工具好、文档优秀、2024 年最火
// - TypeORM：装饰器风格、和 NestJS 搭配、但 Bug 多
// - Sequelize：老牌 ORM、基于回调、API 设计过时

// 💡 本脚本演示 Prisma 的核心用法
// 实际项目中 Prisma 需要先执行 npx prisma generate 生成客户端
// 这里我们用 better-sqlite3 模拟 Prisma 的概念，帮助理解

import Database from 'better-sqlite3';

console.log('='.repeat(60));
console.log('🔷 Prisma ORM 概念讲解');
console.log('='.repeat(60));

// ============================================================
// 1. Prisma Schema —— 数据模型的声明式定义
// ============================================================
console.log('\n📌 1. Prisma Schema\n');

// 💡 Prisma 用 .prisma 文件定义模型，类似 TypeScript 的 interface
// 文件：prisma/schema.prisma
//
// datasource db {
//   provider = "sqlite"          // 或 "postgresql" / "mysql"
//   url      = "file:./dev.db"
// }
//
// model User {
//   id        Int      @id @default(autoincrement())
//   email     String   @unique
//   name      String
//   role      Role     @default(VIEWER)
//   createdAt DateTime @default(now())
//   knowledges Knowledge[] @relation  // 一对多：一个用户有多个知识库
// }
//
// model Knowledge {
//   id          Int      @id @default(autoincrement())
//   name        String
//   description String?
//   createdById Int
//   createdBy   User     @relation(fields: [createdById], references: [id])
//   documents   Document[]                // 一对多
//   createdAt   DateTime @default(now())
//   updatedAt   DateTime @updatedAt
// }
//
// model Document {
//   id          Int      @id @default(autoincrement())
//   title       String
//   content     String?
//   knowledgeId Int
//   knowledge   Knowledge @relation(fields: [knowledgeId], references: [id])
//   createdById Int
//   createdBy   User      @relation(fields: [createdById], references: [id])
//   createdAt   DateTime  @default(now())
// }
//
// enum Role {
//   ADMIN
//   EDITOR
//   VIEWER
// }

console.log('  📝 Schema 定义了 3 个模型 + 1 个枚举');
console.log('  💡 @id 主键 / @unique 唯一 / @default 默认值');
console.log('  💡 @relation 定义关联：一对多、多对一');

// ============================================================
// 2. Prisma CRUD 操作
// ============================================================
console.log('\n📌 2. Prisma CRUD 操作\n');

// 用 SQLite 模拟 Prisma 的操作
const db = new Database(':memory:');
db.exec(`
  CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, name TEXT, role TEXT DEFAULT 'VIEWER', created_at TEXT DEFAULT 'now');
  CREATE TABLE knowledges (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, created_by_id INTEGER, created_at TEXT DEFAULT 'now');
`);

// Prisma 写法（左）vs 原生 SQL（右）对比

// ➕ Create
console.log('  ➕ Create:');
// Prisma: const user = await prisma.user.create({ data: { email: 'a@b.com', name: '张三', role: 'ADMIN' } })
const insert = db.prepare('INSERT INTO users (email, name, role) VALUES (?, ?, ?)');
insert.run('zhangsan@test.com', '张三', 'ADMIN');
insert.run('lisi@test.com', '李四', 'EDITOR');
console.log('    prisma.user.create({ data: { ... } })');

// 📖 Read
console.log('  📖 Read:');
// Prisma: const users = await prisma.user.findMany()
const all = db.prepare('SELECT * FROM users').all();
console.log(`    prisma.user.findMany() → ${all.length} 条`);

// Prisma: const user = await prisma.user.findUnique({ where: { email: 'a@b.com' } })
const one = db.prepare('SELECT * FROM users WHERE email = ?').get('zhangsan@test.com');
console.log(`    prisma.user.findUnique({ where: { email } }) → ${one.name}`);

// Prisma: const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } })
const admins = db.prepare('SELECT * FROM users WHERE role = ?').all('ADMIN');
console.log(`    prisma.user.findMany({ where: { role: 'ADMIN' } }) → ${admins.map(u => u.name)}`);

// ✏️ Update
console.log('  ✏️  Update:');
// Prisma: await prisma.user.update({ where: { id: 1 }, data: { name: '张三丰' } })
db.prepare('UPDATE users SET name = ? WHERE id = ?').run('张三丰', 1);
console.log('    prisma.user.update({ where: { id }, data: { name } })');

// 🗑️ Delete
console.log('  🗑️  Delete:');
// Prisma: await prisma.user.delete({ where: { id: 2 } })
// db.prepare('DELETE FROM users WHERE id = ?').run(2);
console.log('    prisma.user.delete({ where: { id } })');

// ============================================================
// 3. Prisma 关联查询 —— ORM 最强大的能力
// ============================================================
console.log('\n📌 3. 关联查询\n');

db.exec('INSERT INTO knowledges (name, description, created_by_id) VALUES (\'AI基础\', \'AI相关\', 1)');
db.exec('INSERT INTO knowledges (name, description, created_by_id) VALUES (\'前端知识\', \'前端相关\', 1)');

// Prisma: 查询用户时顺便带上他创建的知识库
// const userWithKnowledges = await prisma.user.findUnique({
//   where: { id: 1 },
//   include: { knowledges: true }
// })

const userWithKB = db.prepare(`
  SELECT u.name, k.name AS kb_name
  FROM users u
  LEFT JOIN knowledges k ON k.created_by_id = u.id
  WHERE u.id = 1
`).all();

console.log('  prisma.user.findUnique({ include: { knowledges: true } })');
console.log(`  结果: ${userWithKB.map(r => `${r.name} → ${r.kb_name}`).join(', ')}`);

// 💡 Prisma 的 include vs select：
// include：加载关联数据（JOIN）
// select：选择特定字段（投影）

// ============================================================
// 4. Prisma 迁移 —— 数据库版本管理
// ============================================================
console.log('\n📌 4. 数据库迁移\n');

console.log('  📋 Prisma 迁移命令:');
console.log('    npx prisma migrate dev --name init    # 创建初始迁移');
console.log('    npx prisma migrate dev --name add-doc # 添加 Document 模型');
console.log('    npx prisma migrate reset             # 重置数据库');
console.log('    npx prisma migrate deploy            # 生产环境执行迁移');
console.log('');
console.log('  💡 迁移 = Git for 数据库');
console.log('    每次改 Schema → 生成迁移文件 → 记录变更历史');
console.log('    团队协作时：拉代码 → npx prisma migrate dev → 数据库自动同步');

// ============================================================
// 5. ORM 的优缺点 —— 面试必问
// ============================================================
console.log('\n📌 5. ORM 的优缺点\n');

console.log('  ✅ 优点:');
console.log('    - 类型安全（Prisma 生成的客户端有完整 TS 类型）');
console.log('    - 不用写 SQL，减少手写错误和 SQL 注入');
console.log('    - 关联查询优雅（include 一行搞定多表 JOIN）');
console.log('    - 数据库迁移有版本管理');
console.log('    - 切换数据库只需改 Schema 的 provider');
console.log('');
console.log('  ❌ 缺点:');
console.log('    - 复杂查询性能差（ORM 生成的 SQL 可能不是最优的）');
console.log('    - N+1 查询问题（循环中查关联，每个都发一次 SQL）');
console.log('    - 学习成本（Prisma 的概念很多）');
console.log('    - 调试困难（出了问题不知道 ORM 生成了什么 SQL）');
console.log('');
console.log('  💡 最佳实践:');
console.log('    - 简单 CRUD → 用 ORM');
console.log('    - 复杂查询/报表 → 用 raw SQL（prisma.$queryRaw）');
console.log('    - 始终开启 SQL 日志（log: ['query']）监控性能');

db.close();
console.log('\n✅ Prisma 学习完成！');
