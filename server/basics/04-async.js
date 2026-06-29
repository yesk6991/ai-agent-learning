// 💡 学习要点：Node 后端的异步比前端更复杂
// - 前端异步失败 = UI 报错，用户刷新就好
// - 后端异步失败 = 数据损坏、请求卡死、进程崩溃
//
// 🔍 核心：Promise/async-await 只是语法，错误处理才是关键

import { readFile, writeFile } from 'fs/promises';

console.log('='.repeat(60));
console.log('⚡ Node.js 异步编程');
console.log('='.repeat(60));

// ============================================================
// 1. Promise 链式调用 vs async/await
// ============================================================
console.log('\n📌 1. 两种异步写法对比\n');

// Promise 链式（旧写法，现在少用了）
function fetchUserPromise() {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id: 1, name: '张三' }), 100);
  });
}

fetchUserPromise()
  .then(user => {
    console.log('  Promise 链式:', user.name);
    return { ...user, role: 'admin' };
  })
  .then(userWithRole => {
    console.log('  追加角色:', userWithRole);
  });

// async/await（推荐写法）
async function fetchUserAsync() {
  const user = await new Promise((resolve) => {
    setTimeout(() => resolve({ id: 1, name: '张三' }), 100);
  });
  console.log('  async/await:', user.name);
  const userWithRole = { ...user, role: 'admin' };
  console.log('  追加角色:', userWithRole);
}

fetchUserAsync();

// ============================================================
// 2. 并发控制 —— 三种 Promise 方法
// ============================================================
console.log('\n📌 2. 并发控制\n');

const delay = (ms, value) => new Promise(resolve => setTimeout(() => resolve(value), ms));

// Promise.all：全部成功才成功，一个失败就失败
// 💡 适合：多个独立请求，必须全部完成才继续
async function demoAll() {
  try {
    const results = await Promise.all([
      delay(100, '数据A'),
      delay(200, '数据B'),
      delay(150, '数据C'),
    ]);
    console.log('  Promise.all（全成功）:', results);
  } catch (err) {
    console.log('  Promise.all（有失败）:', err);
  }
}

// Promise.allSettled：不管成功失败，全部等完
// 💡 适合：批量操作，想知道每个的结果
async function demoAllSettled() {
  const results = await Promise.allSettled([
    delay(100, '成功A'),
    delay(200, null).then(() => { throw new Error('失败B'); }),
    delay(150, '成功C'),
  ]);
  console.log('  Promise.allSettled:', results.map(r => `${r.status}: ${r.value || r.reason?.message}`));
}

// Promise.race：谁先完成用谁的结果
// 💡 适合：超时控制——正常请求和定时器赛跑
async function demoRace() {
  try {
    const result = await Promise.race([
      delay(200, '正常响应'),
      delay(3000, null).then(() => { throw new Error('请求超时'); }),
    ]);
    console.log('  Promise.race:', result);
  } catch (err) {
    console.log('  Promise.race:', err.message);
  }
}

await demoAll();
await demoAllSettled();
await demoRace();

// ============================================================
// 3. 错误处理 —— 后端最关键的知识
// ============================================================
console.log('\n📌 3. 错误处理\n');

// ❌ 错误示范：忘记 try-catch，进程直接崩溃
async function badExample() {
  const data = JSON.parse('invalid json'); // 这行会抛错
  return data;
}
// badExample(); // 💡 如果不 catch，未处理的 Promise rejection 会让进程退出

// ✅ 正确示范 1：try-catch 包裹
async function goodExample1() {
  try {
    const data = JSON.parse('invalid json');
    return data;
  } catch (err) {
    console.log('  try-catch 捕获:', err.message);
    return null;
  }
}
await goodExample1();

// ✅ 正确示范 2：.catch() 处理
async function goodExample2() {
  const result = await badExample().catch(err => {
    console.log('  .catch() 捕获:', err.message);
    return null;
  });
  return result;
}
await goodExample2();

// ============================================================
// 4. 全局错误兜底 —— 进程级保护
// ============================================================
console.log('\n📌 4. 全局错误兜底\n');

// 💡 这是 Node 后端的最后一道防线
// 所有未捕获的错误都会到这里

process.on('unhandledRejection', (reason, promise) => {
  console.log('  🚨 unhandledRejection:', reason?.message || reason);
  // 生产环境：记录日志 + 告警，而不是让进程崩溃
});

process.on('uncaughtException', (err) => {
  console.log('  🚨 uncaughtException:', err.message);
  // 💡 注意：uncaughtException 后进程状态不可预测
  // 生产环境：记录日志后优雅退出（PM2 会自动重启）
  // process.exit(1);
});

// 模拟未捕获的错误
Promise.reject(new Error('这个 rejection 没有人 catch'));

// ============================================================
// 5. 实战模式：Express 路由中的错误处理
// ============================================================
console.log('\n📌 5. Express 路由错误处理模式\n');

// 💡 最佳实践：用高阶函数包裹路由，自动 catch 异步错误
// 这样就不用每个路由都写 try-catch 了

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 使用示例（不用真的跑 Express，展示写法）
const mockRoute = asyncHandler(async (req, res) => {
  const user = await fetchUserAsync();
  // 如果这里抛错，会被 asyncHandler 捕获，传给 Express 错误处理中间件
  res.json(user);
});

console.log('  asyncHandler 模式: 把 async 路由的错误自动传给 next(err)');
console.log('  生产项目中推荐用 express-async-errors 包，一行代码搞定');

// ============================================================
// 6. 前端异步 vs 后端异步的核心区别
// ============================================================
console.log('\n📌 6. 前端 vs 后端异步\n');

console.log('  ┌─────────────┬──────────────────┬──────────────────┐');
console.log('  │             │     前端         │     后端         │');
console.log('  ├─────────────┼──────────────────┼──────────────────┤');
console.log('  │ 失败后果    │ UI 报错          │ 数据损坏/崩溃    │');
console.log('  │ 恢复方式    │ 用户刷新页面     │ 进程重启(PM2)    │');
console.log('  │ 并发量      │ 单用户几个请求   │ 数百并发请求     │');
console.log('  │ 资源泄漏    │ 页面关闭自动释放 │ 进程不关一直泄漏 │');
console.log('  │ 必须清理    │ useEffect return │ 监听器/连接池    │');
console.log('  └─────────────┴──────────────────┴──────────────────┘');

console.log('\n✅ 异步编程学习完成！');
