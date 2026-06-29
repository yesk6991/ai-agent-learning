// 💡 学习要点：RBAC（基于角色的访问控制）是企业应用的权限标准
// 用户 → 角色 → 权限，三层关系
//
// 🔍 权限模型对比：
// - ACL：访问控制列表，每个资源记录谁能访问（简单但难维护）
// - RBAC：角色控制，用户绑角色，角色绑权限（最常用）
// - ABAC：属性控制，根据用户/环境/资源的属性动态判断（灵活但复杂）

console.log('='.repeat(60));
console.log('🛡️  RBAC 权限控制');
console.log('='.repeat(60));

// ============================================================
// 1. 角色与权限定义
// ============================================================
console.log('\n📌 1. 角色与权限\n');

// 💡 权限格式：资源:操作
// 如 knowledge:create = 创建知识库的权限

const ROLES = {
  ADMIN: {
    name: '管理员',
    permissions: [
      'user:list', 'user:create', 'user:update', 'user:delete', 'user:assign-role',
      'knowledge:list', 'knowledge:create', 'knowledge:update', 'knowledge:delete',
      'document:list', 'document:upload', 'document:delete',
      'chat:access',
    ],
  },
  EDITOR: {
    name: '编辑者',
    permissions: [
      'knowledge:list', 'knowledge:create', 'knowledge:update',
      'document:list', 'document:upload', 'document:delete',
      'chat:access',
    ],
  },
  VIEWER: {
    name: '查看者',
    permissions: [
      'knowledge:list',
      'document:list',
      'chat:access',
    ],
  },
};

console.log('  角色权限矩阵:');
const resources = ['user', 'knowledge', 'document', 'chat'];
for (const [role, config] of Object.entries(ROLES)) {
  const perms = resources.map(r => {
    const actions = config.permissions
      .filter(p => p.startsWith(r + ':'))
      .map(p => p.split(':')[1]);
    return actions.join(',') || '-';
  });
  console.log(`  ${role.padEnd(8)} ${perms.map(p => p.padEnd(25)).join(' ')}`);
}

// ============================================================
// 2. 权限检查函数
// ============================================================
console.log('\n📌 2. 权限检查\n');

function hasPermission(role, permission) {
  return ROLES[role]?.permissions.includes(permission) || false;
}

console.log(`  ADMIN 可以创建用户?  ${hasPermission('ADMIN', 'user:create')}`);
console.log(`  EDITOR 可以创建用户? ${hasPermission('EDITOR', 'user:create')}`);
console.log(`  VIEWER 可以上传文档? ${hasPermission('VIEWER', 'document:upload')}`);

// ============================================================
// 3. Express 权限中间件
// ============================================================
console.log('\n📌 3. Express 权限中间件\n');

// 💡 这是实际项目中 RBAC 中间件的写法
// 用法：app.delete('/users/:id', requirePermission('user:delete'), handler)

const requirePermission = (permission) => {
  return (req, res, next) => {
    // 假设 auth 中间件已经把用户信息挂到了 req.user
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(401).json({ error: '未认证' });
    }
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({
        error: '权限不足',
        required: permission,
        yourRole: userRole,
      });
    }
    next();
  };
};

// 模拟请求
const mockReq = { user: { role: 'VIEWER' } };
const mockRes = {
  status: (code) => ({ json: (data) => console.log(`  ${code}:`, data) }),
};

console.log('  模拟 VIEWER 请求删除用户:');
requirePermission('user:delete')(mockReq, mockRes, () => {
  console.log('  ✅ 通过');
});

const adminReq = { user: { role: 'ADMIN' } };
console.log('  模拟 ADMIN 请求删除用户:');
requirePermission('user:delete')(adminReq, mockRes, () => {
  console.log('  ✅ 通过');
});

// ============================================================
// 4. 路由级权限绑定
// ============================================================
console.log('\n📌 4. 路由级权限绑定\n');

// 💡 实际项目中的路由定义（伪代码，展示写法）
const routePermissions = {
  'GET    /api/users':               'user:list',
  'POST   /api/users':               'user:create',
  'DELETE /api/users/:id':           'user:delete',
  'PATCH  /api/users/:id/role':      'user:assign-role',
  'GET    /api/knowledges':          'knowledge:list',
  'POST   /api/knowledges':          'knowledge:create',
  'PUT    /api/knowledges/:id':      'knowledge:update',
  'DELETE /api/knowledges/:id':      'knowledge:delete',
  'POST   /api/documents/upload':    'document:upload',
  'DELETE /api/documents/:id':       'document:delete',
  'POST   /api/chat':               'chat:access',
};

console.log('  路由 → 权限映射:');
for (const [route, perm] of Object.entries(routePermissions)) {
  console.log(`    ${route.padEnd(35)} → ${perm}`);
}

// ============================================================
// 5. 401 vs 403 的区别
// ============================================================
console.log('\n📌 5. 401 vs 403\n');

console.log('  401 Unauthorized: 你是谁？（未认证/Token 无效）');
console.log('  403 Forbidden:    你不能做这个！（已认证但权限不够）');
console.log('');
console.log('  💡 类比：');
console.log('    401 = 没有门禁卡，进不了大楼');
console.log('    403 = 有门禁卡，但这个房间你没有权限进');

// ============================================================
// 6. RBAC vs ABAC vs ACL
// ============================================================
console.log('\n📌 6. 权限模型对比\n');

console.log('  ┌────────┬──────────────────────────┬────────────────────┐');
console.log('  │ 模型   │ 逻辑                     │ 适用场景           │');
console.log('  ├────────┼──────────────────────────┼────────────────────┤');
console.log('  │ ACL    │ 资源 → 允许访问的用户列表 │ 文件系统权限       │');
console.log('  │ RBAC   │ 用户 → 角色 → 权限       │ 企业管理系统(我们) │');
console.log('  │ ABAC   │ 用户+环境+资源 → 动态判断 │ 云平台IAM          │');
console.log('  └────────┴──────────────────────────┴────────────────────┘');
console.log('');
console.log('  💡 90% 的企业应用用 RBAC 就够了');
console.log('  💡 需要细粒度控制时（如"只能删除自己创建的"），在 RBAC 基础上加业务层判断');

console.log('\n✅ RBAC 权限学习完成！');
