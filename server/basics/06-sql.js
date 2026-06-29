// 💡 学习要点：数据库是后端的核心——90% 的后端工作都在和数据打交道
// 先学 SQL 原理，再学 ORM——不懂 SQL 的话 ORM 就是黑盒
//
// 🔍 为什么选 SQLite？
// - 零配置：不需要安装数据库服务，一个文件就是数据库
// - 适合学习：SQL 语法和 MySQL/PostgreSQL 基本一致
// - Node.js 集成简单：better-sqlite3 一个包搞定

import Database from 'better-sqlite3';

console.log('='.repeat(60));
console.log('🗄️  SQL 基础 + SQLite');
console.log('='.repeat(60));

// 创建内存数据库（学习用，关闭就没了）
// 💡 生产环境用文件数据库：new Database('./data.db')
const db = new Database(':memory:');

// ============================================================
// 1. 建表 —— CREATE TABLE
// ============================================================
console.log('\n📌 1. 建表\n');

// 💡 SQL 数据类型：INTEGER(整数)/TEXT(文本)/REAL(浮点)/BLOB(二进制)
// 💡 PRIMARY KEY：主键，唯一标识一行
// 💡 NOT NULL：不允许为空
// 💡 UNIQUE：值必须唯一（如 email）

db.exec(`
  CREATE TABLE users (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role  TEXT NOT NULL DEFAULT 'viewer',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE knowledges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    created_by  INTEGER NOT NULL,
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    content       TEXT,
    knowledge_id  INTEGER NOT NULL,
    created_by    INTEGER NOT NULL,
    created_at    TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (knowledge_id) REFERENCES knowledges(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

console.log('  ✅ 创建了 3 张表: users, knowledges, documents');

// ============================================================
// 2. 插入数据 —— INSERT
// ============================================================
console.log('\n📌 2. 插入数据\n');

// 💡 参数化查询：用 ? 占位，防止 SQL 注入
// 永远不要用字符串拼接：`INSERT INTO users VALUES (${name})` ← 危险！
const insertUser = db.prepare('INSERT INTO users (name, email, role) VALUES (?, ?, ?)');

const user1 = insertUser.run('张三', 'zhangsan@test.com', 'admin');
const user2 = insertUser.run('李四', 'lisi@test.com', 'editor');
const user3 = insertUser.run('王五', 'wangwu@test.com', 'viewer');

console.log(`  ✅ 插入 3 个用户, 自增 ID: ${user1.lastInsertRowid}, ${user2.lastInsertRowid}, ${user3.lastInsertRowid}`);

// 插入知识库
const insertKnowledge = db.prepare('INSERT INTO knowledges (name, description, created_by) VALUES (?, ?, ?)');
insertKnowledge.run('AI 基础知识库', '大语言模型、Agent、RAG 相关知识', 1);
insertKnowledge.run('前端工程化知识库', 'React、Webpack、Vite 相关知识', 2);

// ============================================================
// 3. 查询数据 —— SELECT
// ============================================================
console.log('\n📌 3. 查询数据\n');

// 基础查询
const allUsers = db.prepare('SELECT * FROM users').all();
console.log('  全部用户:', allUsers.map(u => u.name).join(', '));

// 条件查询 WHERE
const admins = db.prepare('SELECT * FROM users WHERE role = ?').all('admin');
console.log('  管理员:', admins.map(u => u.name).join(', '));

// 💡 模糊查询 LIKE
const searchUsers = db.prepare("SELECT * FROM users WHERE name LIKE ?").all('%三%');
console.log('  搜索"三":', searchUsers.map(u => u.name).join(', '));

// 排序 ORDER BY + 分页 LIMIT/OFFSET
const pagedUsers = db.prepare('SELECT * FROM users ORDER BY id DESC LIMIT ? OFFSET ?').all(2, 0);
console.log('  分页(第1页,每页2条):', pagedUsers.map(u => u.name).join(', '));

// ============================================================
// 4. 关联查询 —— JOIN
// ============================================================
console.log('\n📌 4. 关联查询\n');

// 💡 JOIN 是 SQL 最重要的能力：把多张表的数据关联起来
// INNER JOIN：只返回两表都有的匹配行
// LEFT JOIN：左表全部返回，右表没有的填 NULL

const knowledgeWithCreator = db.prepare(`
  SELECT k.name AS knowledge_name, u.name AS creator_name
  FROM knowledges k
  INNER JOIN users u ON k.created_by = u.id
`).all();

console.log('  知识库 + 创建者:');
knowledgeWithCreator.forEach(row => {
  console.log(`    ${row.knowledge_name} ← 创建者: ${row.creator_name}`);
});

// ============================================================
// 5. 更新和删除 —— UPDATE / DELETE
// ============================================================
console.log('\n📌 5. 更新和删除\n');

const updateResult = db.prepare('UPDATE users SET role = ? WHERE name = ?').run('editor', '王五');
console.log(`  ✅ 更新: ${updateResult.changes} 行受影响`);

const deleteResult = db.prepare('DELETE FROM users WHERE name = ?').run('王五');
console.log(`  ✅ 删除: ${deleteResult.changes} 行受影响`);

// ============================================================
// 6. 事务 —— 保证数据一致性
// ============================================================
console.log('\n📌 6. 事务\n');

// 💡 事务的 ACID 特性：
// A(Atomicity)   原子性：要么全部成功，要么全部回滚
// C(Consistency)  一致性：事务前后数据始终合法
// I(Isolation)    隔离性：并发事务互不干扰
// D(Durability)   持久性：提交后数据不会丢
//
// 💡 什么时候需要事务？
// 当一个业务操作涉及多条 SQL，必须保证"要么全做，要么全不做"
// 比如：转账 = A 扣钱 + B 加钱，不能 A 扣了 B 没加

const createUserWithKnowledge = db.transaction((userName, userEmail, knowledgeName, knowledgeDesc) => {
  // 步骤1：创建用户
  const userResult = insertUser.run(userName, userEmail, 'editor');

  // 步骤2：创建该用户的知识库
  insertKnowledge.run(knowledgeName, knowledgeDesc, userResult.lastInsertRowid);

  return { userId: userResult.lastInsertRowid };
});

// ✅ 成功的事务
const result = createUserWithKnowledge('赵六', 'zhaoliu@test.com', '赵六的知识库', '测试');
console.log(`  ✅ 事务成功: 用户赵六 + 知识库一起创建, userId=${result.userId}`);

// ❌ 失败的事务（email 重复会触发 UNIQUE 约束）
try {
  createUserWithKnowledge('赵六2', 'zhaoliu@test.com', '不会创建', '不会创建');
} catch (err) {
  console.log(`  ❌ 事务失败回滚: ${err.message}`);
  console.log('  💡 用户和知识库都没有被创建——事务保证了原子性');
}

// ============================================================
// 7. SQL 速查表
// ============================================================
console.log('\n📌 7. SQL 速查表\n');

console.log('  ┌────────────────────────────────────────────────────────┐');
console.log('  │ 操作        │ SQL                                     │');
console.log('  ├────────────────────────────────────────────────────────┤');
console.log('  │ 建表        │ CREATE TABLE xxx (...)                  │');
console.log('  │ 插入        │ INSERT INTO xxx (cols) VALUES (vals)    │');
console.log('  │ 查询全部    │ SELECT * FROM xxx                       │');
console.log('  │ 条件查询    │ SELECT * FROM xxx WHERE col = ?         │');
console.log('  │ 模糊搜索    │ SELECT * FROM xxx WHERE col LIKE ?      │');
console.log('  │ 排序+分页   │ SELECT * FROM xxx ORDER BY id LIMIT ?   │');
console.log('  │ 关联查询    │ SELECT * FROM a JOIN b ON a.id = b.a_id │');
console.log('  │ 更新        │ UPDATE xxx SET col = ? WHERE id = ?     │');
console.log('  │ 删除        │ DELETE FROM xxx WHERE id = ?            │');
console.log('  │ 聚合统计    │ SELECT COUNT(*), AVG(col) FROM xxx      │');
console.log('  │ 分组统计    │ SELECT role, COUNT(*) FROM xxx GROUP BY │');
console.log('  └────────────────────────────────────────────────────────┘');

db.close();
console.log('\n✅ SQL 基础学习完成！');
