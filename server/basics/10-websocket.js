// 💡 学习要点：WebSocket 是全双工实时通信协议
// HTTP：客户端问一次，服务端答一次（单向）
// WebSocket：建立连接后双方随时互发消息（双向）
//
// 🔍 WebSocket vs SSE vs 长轮询
// WebSocket：双向实时，适合聊天/协作
// SSE：服务端→客户端单向流，适合 AI 流式输出
// 长轮询：兼容性最好，性能最差，已过时

import { WebSocketServer } from 'ws';

console.log('='.repeat(60));
console.log('🔌 WebSocket 实时通信');
console.log('='.repeat(60));

// ============================================================
// 1. WebSocket 服务器
// ============================================================
console.log('\n📌 1. WebSocket 服务器\n');

const wss = new WebSocketServer({ port: 8080 });

// 💡 连接管理：记录所有在线客户端
const clients = new Map(); // ws → { userId, username }

wss.on('connection', (ws) => {
  console.log('  🔗 新客户端连接');

  // 注册客户端
  const userId = Date.now();
  clients.set(ws, { userId, username: `用户${userId}` });

  // 通知所有人：有人上线
  broadcast({
    type: 'system',
    content: `${clients.get(ws).username} 加入了聊天室`,
    onlineCount: clients.size,
  });

  // 💡 接收客户端消息
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const sender = clients.get(ws);

    switch (msg.type) {
      case 'chat':
        // 广播聊天消息
        broadcast({
          type: 'chat',
          userId: sender.userId,
          username: sender.username,
          content: msg.content,
          timestamp: Date.now(),
        });
        break;

      case 'ping':
        // 💡 心跳机制：客户端定期发 ping，服务端回 pong
        // 如果超时没收到 ping，认为连接断开
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  });

  // 💡 连接关闭
  ws.on('close', () => {
    const user = clients.get(ws);
    clients.delete(ws);
    console.log(`  🔗 ${user?.username} 断开连接`);
    broadcast({
      type: 'system',
      content: `${user?.username} 离开了聊天室`,
      onlineCount: clients.size,
    });
  });

  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'welcome',
    content: '欢迎来到聊天室！',
    userId,
    onlineCount: clients.size,
  }));
});

// 💡 广播：给所有在线客户端发消息
function broadcast(message) {
  const data = JSON.stringify(message);
  for (const [ws] of clients) {
    if (ws.readyState === 1) { // 1 = OPEN
      ws.send(data);
    }
  }
}

// ============================================================
// 2. 客户端模拟
// ============================================================
console.log('\n📌 2. 客户端代码示例（浏览器端）\n');

const clientCode = `
// 浏览器端 WebSocket 代码
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('连接成功');
  // 发送消息
  ws.send(JSON.stringify({ type: 'chat', content: '你好！' }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('收到消息:', msg);
};

ws.onclose = () => {
  console.log('连接关闭');
};

// 💡 心跳：每 30 秒发一次 ping，保持连接
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000);

// 💡 断线重连
ws.onclose = () => {
  setTimeout(() => {
    console.log('尝试重连...');
    // new WebSocket(...)
  }, 3000);
};
`;

console.log(clientCode);

// ============================================================
// 3. SSE vs WebSocket 选型
// ============================================================
console.log('\n📌 3. 实时通信方案选型\n');

console.log('  ┌──────────────┬──────────────────┬──────────────────┬──────────────────┐');
console.log('  │              │     WebSocket    │     SSE          │     长轮询       │');
console.log('  ├──────────────┼──────────────────┼──────────────────┼──────────────────┤');
console.log('  │ 方向         │ 双向             │ 服务端→客户端    │ 客户端→服务端    │');
console.log('  │ 协议         │ ws://            │ HTTP             │ HTTP             │');
console.log('  │ 实时性       │ 毫秒级           │ 毫秒级           │ 秒级             │');
console.log('  │ 兼容性       │ 现代浏览器       │ 所有浏览器       │ 所有浏览器       │');
console.log('  │ 连接开销     │ 一次握手         │ 一次HTTP请求     │ 每次都建连接     │');
console.log('  │ 适用场景     │ 聊天/协作/游戏   │ AI流式/推送通知  │ 兼容老浏览器     │');
console.log('  └──────────────┴──────────────────┴──────────────────┴──────────────────┘');
console.log('');
console.log('  💡 我们的 AI 知识库项目两个都用:');
console.log('    AI 对话输出 → SSE（服务端单向流式推送）');
console.log('    实时聊天    → WebSocket（双向通信）');

console.log('\n⏳ WebSocket 服务器已启动在 ws://localhost:8080');
console.log('   在浏览器控制台运行上面的客户端代码即可连接');
console.log('   按 Ctrl+C 退出\n');
