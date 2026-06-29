// 💡 学习要点：后端错误处理比前端重要 10 倍
// - 前端崩了：用户刷新页面就好
// - 后端崩了：所有用户的请求都失败，数据可能损坏
//
// 🔍 后端错误的分类：
// 1. 业务错误：用户操作不合法（404/400/403）→ 返回友好提示
// 2. 认证错误：Token 无效/过期（401）→ 引导重新登录
// 3. 系统错误：数据库挂了/第三方 API 超时（500）→ 记日志 + 告警

console.log('='.repeat(60));
console.log('🚨 生产级错误处理');
console.log('='.repeat(60));

// ============================================================
// 1. 自定义错误类 —— 错误分类的基础
// ============================================================
console.log('\n📌 1. 自定义错误类\n');

// 💡 继承 Error，添加 HTTP 状态码和错误码
class BusinessError extends Error {
  constructor(message, code = 'BUSINESS_ERROR') {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = 400;
    this.code = code;
  }
}

class AuthError extends Error {
  constructor(message = '认证失败', code = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthError';
    this.statusCode = 401;
    this.code = code;
  }
}

class ForbiddenError extends Error {
  constructor(message = '权限不足', code = 'FORBIDDEN') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
    this.code = code;
  }
}

class NotFoundError extends Error {
  constructor(resource = '资源', code = 'NOT_FOUND') {
    super(`${resource}不存在`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.code = code;
  }
}

// 使用示例
try {
  throw new NotFoundError('知识库');
} catch (err) {
  console.log(`  ${err.name}: ${err.statusCode} ${err.code} - ${err.message}`);
}

try {
  throw new BusinessError('知识库名称不能为空', 'INVALID_INPUT');
} catch (err) {
  console.log(`  ${err.name}: ${err.statusCode} ${err.code} - ${err.message}`);
}

// ============================================================
// 2. Express 全局错误处理中间件
// ============================================================
console.log('\n📌 2. Express 全局错误处理中间件\n');

// 💡 这是生产级错误处理中间件的完整写法
const errorHandler = (err, req, res, next) => {
  // 已知的业务错误
  if (err instanceof BusinessError || err instanceof AuthError ||
      err instanceof ForbiddenError || err instanceof NotFoundError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    });
  }

  // Zod 校验错误（请求参数不合法）
  if (err.name === 'ZodError') {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: '请求参数不合法',
      errors: err.errors,
    });
  }

  // Prisma 错误（数据库操作失败）
  if (err.code === 'P2002') { // 唯一约束冲突
    return res.status(409).json({
      code: 'DUPLICATE_ENTRY',
      message: '数据已存在',
    });
  }
  if (err.code === 'P2025') { // 记录不存在
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: '资源不存在',
    });
  }

  // 💡 未知的系统错误 → 500 + 记日志 + 不暴露细节
  console.error('❌ 未预期错误:', err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? '服务器内部错误'
      : err.message,
    // 💡 生产环境不返回堆栈，避免泄露内部实现
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

console.log('  ✅ 错误处理中间件已定义');
console.log('  💡 使用: app.use(errorHandler) —— 注册在所有路由之后');

// ============================================================
// 3. 全局兜底 —— 进程级错误捕获
// ============================================================
console.log('\n📌 3. 全局兜底\n');

// 💡 即使有了 errorHandler，某些错误还是会绕过 Express
// 比如：定时器中的异常、Promise 中未 catch 的异常

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 unhandledRejection:', reason);
  // 💡 生产环境：记录日志 + 发告警，不退出进程
  // 因为 unhandledRejection 不一定会导致进程状态异常
});

process.on('uncaughtException', (err) => {
  console.error('🚨 uncaughtException:', err.message);
  // 💡 生产环境：记录日志 + 发告警 + 优雅退出
  // uncaughtException 后进程状态不可预测，必须重启
  // PM2 会自动重启
  // process.exit(1);
});

// ============================================================
// 4. 统一响应格式
// ============================================================
console.log('\n📌 4. 统一响应格式\n');

// 💡 前后端约定统一的响应格式，前端处理更简单
const response = {
  // 成功
  success: (res, data, message = '操作成功') => {
    res.json({ code: 0, message, data });
  },
  // 创建成功
  created: (res, data, message = '创建成功') => {
    res.status(201).json({ code: 0, message, data });
  },
  // 分页
  paginated: (res, data, total, page, size) => {
    res.json({
      code: 0,
      data,
      pagination: { total, page, size, totalPages: Math.ceil(total / size) },
    });
  },
};

console.log('  成功响应:   { code: 0, message: "操作成功", data: {...} }');
console.log('  分页响应:   { code: 0, data: [...], pagination: {...} }');
console.log('  错误响应:   { code: "ERROR_CODE", message: "错误描述" }');
console.log('');
console.log('  💡 code: 0 表示成功，非 0/字符串表示错误');
console.log('  💡 前端判断: if (res.code === 0) 成功 else 失败');

// ============================================================
// 5. 错误处理最佳实践
// ============================================================
console.log('\n📌 5. 错误处理最佳实践\n');

console.log('  1️⃣  永远不要吞掉错误');
console.log('     ❌ catch(() => {})          // 什么都不做');
console.log('     ✅ catch(err => log(err))   // 至少记录日志\n');

console.log('  2️⃣  区分已知错误和未知错误');
console.log('     已知错误 → 返回友好的错误信息');
console.log('     未知错误 → 500 + 告警 + 不暴露细节\n');

console.log('  3️⃣  异步路由必须 catch');
console.log('     用 express-async-errors 或 asyncHandler 包裹\n');

console.log('  4️⃣  生产环境不暴露堆栈和内部信息');
console.log('     err.stack 只在开发环境返回\n');

console.log('  5️⃣  数据库错误要特殊处理');
console.log('     Prisma 的错误码比通用 500 更有用\n');

console.log('✅ 错误处理学习完成！');
