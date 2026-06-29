// 💡 学习要点：JWT 是前后端分离项目的认证标准方案
// 前端存 Token → 每次请求带上 Token → 后端验证 Token → 识别用户
//
// 🔍 JWT vs Session
// Session：服务端存状态，用户 ID 存在服务端内存/Redis
// JWT：无状态，用户信息编码在 Token 里，服务端不存任何东西

import jwt from 'jsonwebtoken';

console.log('='.repeat(60));
console.log('🔐 JWT 认证');
console.log('='.repeat(60));

const SECRET = 'my-secret-key'; // 💡 生产环境必须用环境变量：process.env.JWT_SECRET

// ============================================================
// 1. JWT 结构解析
// ============================================================
console.log('\n📌 1. JWT 结构\n');

// JWT 由三部分组成：Header.Payload.Signature
// 用 . 分隔，看起来像：eyJhbG...xMjM0.eyJzdW...fQ.sig

const payload = { userId: 1, name: '张三', role: 'admin' };

// 签发 Token
const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
console.log('  签发的 Token:');
console.log(`  ${token}\n`);

// 解析 Token 的三部分
const parts = token.split('.');
console.log('  Header (算法+类型):');
console.log(`    ${Buffer.from(parts[0], 'base64url').toString()}`);
console.log('  Payload (数据):');
console.log(`    ${Buffer.from(parts[1], 'base64url').toString()}`);
console.log('  Signature (签名):');
console.log(`    ${parts[2].slice(0, 20)}...`);
console.log('');
console.log('  💡 Header 和 Payload 只是 Base64 编码，不是加密！任何人都能解码');
console.log('  💡 Signature 保证数据不被篡改——不知道 SECRET 就无法伪造签名');

// ============================================================
// 2. 验证 Token
// ============================================================
console.log('\n📌 2. 验证 Token\n');

try {
  const decoded = jwt.verify(token, SECRET);
  console.log('  ✅ 验证通过:', decoded);
} catch (err) {
  console.log('  ❌ 验证失败:', err.message);
}

// 验证假 Token
try {
  jwt.verify(token.slice(0, -5) + 'xxxxx', SECRET);
} catch (err) {
  console.log('  ❌ 篡改的 Token:', err.message);
}

// 验证过期 Token
const expiredToken = jwt.sign(payload, SECRET, { expiresIn: '0s' });
try {
  jwt.verify(expiredToken, SECRET);
} catch (err) {
  console.log('  ❌ 过期的 Token:', err.message);
}

// ============================================================
// 3. Access Token + Refresh Token 双 Token 方案
// ============================================================
console.log('\n📌 3. 双 Token 方案\n');

// 💡 为什么需要两个 Token？
// Access Token：短期（15分钟），每次请求都带
// Refresh Token：长期（7天），只在刷新时用
//
// 如果 Access Token 泄露 → 15 分钟后自动失效，损失有限
// 如果只用一个长期 Token → 泄露后长时间可用，风险大

const ACCESS_SECRET = 'access-secret';
const REFRESH_SECRET = 'refresh-secret';

// 签发双 Token
const accessToken = jwt.sign(
  { userId: 1, role: 'admin', type: 'access' },
  ACCESS_SECRET,
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  { userId: 1, type: 'refresh' },
  REFRESH_SECRET,
  { expiresIn: '7d' }
);

console.log('  Access Token (15min):', accessToken.slice(0, 30) + '...');
console.log('  Refresh Token (7d):  ', refreshToken.slice(0, 30) + '...');
console.log('');
console.log('  💡 前端存储位置:');
console.log('    Access Token → 内存（JS 变量）→ 页面刷新丢失 → 用 Refresh Token 重新获取');
console.log('    Refresh Token → httpOnly Cookie → 刷新时自动带上');
console.log('');
console.log('  💡 刷新流程:');
console.log('    1. Access Token 过期 → 请求返回 401');
console.log('    2. 前端用 Refresh Token 调 /auth/refresh');
console.log('    3. 后端验证 Refresh Token → 签发新的 Access Token');
console.log('    4. 前端拿到新 Access Token → 重试原请求');

// ============================================================
// 4. Token 黑名单 —— 登出/踢人
// ============================================================
console.log('\n📌 4. Token 黑名单\n');

// 💡 JWT 是无状态的，签发后无法撤销
// 如果用户点"登出"，Token 还在有效期内怎么办？
// → 用黑名单：记录已登出但未过期的 Token

const tokenBlacklist = new Set();

function logout(token) {
  // 解码 Token（不验证签名，只看内容）
  const decoded = jwt.decode(token);
  if (decoded?.exp && decoded.exp * 1000 > Date.now()) {
    // Token 还没过期，加入黑名单
    tokenBlacklist.add(token);
    console.log('  🚫 Token 已加入黑名单');
  }
}

function verifyWithBlacklist(token, secret) {
  // 先检查黑名单
  if (tokenBlacklist.has(token)) {
    throw new Error('Token 已被撤销');
  }
  return jwt.verify(token, secret);
}

logout(accessToken);
try {
  verifyWithBlacklist(accessToken, ACCESS_SECRET);
} catch (err) {
  console.log('  ❌ 黑名单中的 Token:', err.message);
}

console.log('');
console.log('  💡 生产级方案：用 Redis 存黑名单（SET 结构，O(1) 查询）');
console.log('  💡 黑名单的 TTL = Token 剩余过期时间，过期后自动清理');

// ============================================================
// 5. Express 中间件实现
// ============================================================
console.log('\n📌 5. Express 认证中间件\n');

// 💡 这就是实际项目中 auth 中间件的写法
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供 Token' });
  }

  const token = authHeader.slice(7); // 去掉 "Bearer "
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = decoded; // 挂载用户信息
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token 已过期', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token 无效' });
  }
};

console.log('  使用方式:');
console.log('    app.use("/api", authMiddleware);  // /api 下的路由都需要认证');
console.log('    app.get("/api/profile", (req, res) => res.json(req.user));');

// ============================================================
// 6. JWT vs Session 对比
// ============================================================
console.log('\n📌 6. JWT vs Session\n');

console.log('  ┌──────────────┬────────────────────┬────────────────────┐');
console.log('  │              │     JWT            │     Session        │');
console.log('  ├──────────────┼────────────────────┼────────────────────┤');
console.log('  │ 状态         │ 无状态             │ 有状态（服务端存） │');
console.log('  │ 扩展性       │ 天然支持分布式     │ 需要 Redis 共享    │');
console.log('  │ 性能         │ 每次验证要解码     │ 查 Redis 很快      │');
console.log('  │ 撤销         │ 需要黑名单         │ 直接删服务端数据   │');
console.log('  │ 适用场景     │ 前后端分离/移动端  │ 传统服务端渲染     │');
console.log('  └──────────────┴────────────────────┴────────────────────┘');
console.log('');
console.log('  💡 我们的 AI 知识库项目用 JWT，因为是前后端分离架构');

console.log('\n✅ JWT 认证学习完成！');
