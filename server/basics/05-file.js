// 💡 学习要点：文件系统是 Node 后端最常见的 I/O 操作
// - 前端几乎没有文件操作（除了 <input type="file">）
// - 后端天天和文件打交道：上传、下载、日志、配置、模板
//
// 🔍 核心概念：Stream（流）
// - 小文件用 readFile 一次性读入内存
// - 大文件必须用 Stream 分块读写，否则内存爆炸
// - 1GB 的文件用 readFile = 占用 1GB 内存
// - 1GB 的文件用 Stream = 始终只占几十 KB 内存

import { readFileSync, writeFileSync, createReadStream, createWriteStream } from 'fs';
import { readFile, writeFile, unlink, mkdir, stat } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { join } from 'path';

console.log('='.repeat(60));
console.log('📁 Node.js 文件系统');
console.log('='.repeat(60));

// ============================================================
// 1. 基础文件操作
// ============================================================
console.log('\n📌 1. 基础文件操作\n');

const TMP_DIR = '/tmp/node-learn';

// 确保目录存在
await mkdir(TMP_DIR, { recursive: true });

// 写文件
await writeFile(join(TMP_DIR, 'hello.txt'), '你好，Node.js 文件系统！\n第二行内容');
console.log('  ✅ 写入文件: hello.txt');

// 读文件
const content = await readFile(join(TMP_DIR, 'hello.txt'), 'utf-8');
console.log('  📖 读取文件:', content.replace(/\n/g, '\\n'));

// 文件信息
const info = await stat(join(TMP_DIR, 'hello.txt'));
console.log('  📊 文件大小:', info.size, 'bytes');

// 删除文件
await unlink(join(TMP_DIR, 'hello.txt'));
console.log('  🗑️  删除文件: hello.txt');

// ============================================================
// 2. 同步 vs 异步 —— 什么时候用同步？
// ============================================================
console.log('\n📌 2. 同步 vs 异步\n');

// 💡 原则：99% 的情况用异步
// 唯一例外：应用启动时读取配置文件（此时还没开始处理请求，阻塞无所谓）

// 同步读取（阻塞）
const syncContent = readFileSync('/etc/hosts', 'utf-8');
console.log('  同步读取 /etc/hosts:', syncContent.split('\n')[0]);

// 异步读取（非阻塞，推荐）
const asyncContent = await readFile('/etc/hosts', 'utf-8');
console.log('  异步读取 /etc/hosts:', asyncContent.split('\n')[0]);

console.log('\n  💡 什么时候用同步：应用启动时读配置');
console.log('  💡 什么时候用异步：请求处理中读写文件（永远用异步）');

// ============================================================
// 3. Stream 流 —— 大文件的正确处理方式
// ============================================================
console.log('\n📌 3. Stream 流\n');

// 💡 创建一个大文件来演示
const bigFilePath = join(TMP_DIR, 'big-file.txt');
const bigContent = '这是一行测试数据，用来模拟大文件。\n'.repeat(100000); // ~3.5MB
await writeFile(bigFilePath, bigContent);
const bigStat = await stat(bigFilePath);
console.log(`  📄 创建大文件: ${(bigStat.size / 1024 / 1024).toFixed(2)} MB`);

// ❌ 错误方式：readFile 一次性加载到内存
// const allData = await readFile(bigFilePath); // 3.5MB 全部进入内存
// 💡 如果是 1GB 的文件呢？内存直接爆掉

// ✅ 正确方式：Stream 分块读取
let streamLineCount = 0;
let streamBytesRead = 0;

await new Promise((resolve, reject) => {
  const stream = createReadStream(bigFilePath, { encoding: 'utf-8', highWaterMark: 64 * 1024 });
  stream.on('data', (chunk) => {
    streamLineCount += chunk.split('\n').length - 1;
    streamBytesRead += chunk.length;
  });
  stream.on('end', resolve);
  stream.on('error', reject);
});

console.log(`  🌊 Stream 读取: ${streamLineCount} 行, ${(streamBytesRead / 1024 / 1024).toFixed(2)} MB`);
console.log('  💡 Stream 的内存占用始终只有 highWaterMark 大小（64KB）');

// ============================================================
// 4. Pipeline 管道 —— 连接读写流
// ============================================================
console.log('\n📌 4. Pipeline 管道\n');

// 💡 pipeline = Stream 的管道，把可读流接到可写流
// 最经典的例子：读取文件 → Gzip 压缩 → 写入压缩文件

const gzipPath = join(TMP_DIR, 'big-file.txt.gz');

await pipeline(
  createReadStream(bigFilePath),      // 可读流：读大文件
  createGzip(),                        // 转换流：Gzip 压缩
  createWriteStream(gzipPath),         // 可写流：写入压缩文件
);

const gzipStat = await stat(gzipPath);
console.log(`  📦 Gzip 压缩: ${(bigStat.size / 1024 / 1024).toFixed(2)} MB → ${(gzipStat.size / 1024).toFixed(0)} KB`);
console.log(`  💡 压缩率: ${((1 - gzipStat.size / bigStat.size) * 100).toFixed(1)}%`);

// ============================================================
// 5. 文件上传 —— 后端最常见需求
// ============================================================
console.log('\n📌 5. 文件上传原理\n');

// 💡 文件上传的本质：
// 1. 前端用 <form enctype="multipart/form-data"> 或 FormData
// 2. 浏览器把文件内容编码成 multipart 格式发送
// 3. 后端解析 multipart，提取文件字段，保存到磁盘
//
// Express 中用 multer 库处理文件上传：
// ```js
// import multer from 'multer';
// const upload = multer({ dest: 'uploads/' }); // 保存目录
// app.post('/upload', upload.single('file'), (req, res) => {
//   console.log(req.file); // 文件信息
//   res.json({ message: '上传成功' });
// });
// ```
//
// 💡 大文件上传的进阶方案：
// - 分片上传：前端把大文件切成 5MB 的小块，逐块上传
// - 断点续传：记录已上传的分片，中断后从断点继续
// - 秒传：文件 MD5 匹配已有文件，直接返回成功不上传

console.log('  📤 文件上传原理:');
console.log('    1. 前端 FormData → multipart/form-data 编码');
console.log('    2. 后端 multer 解析 → 保存到磁盘');
console.log('    3. 大文件用分片上传 + 断点续传');

// ============================================================
// 6. Buffer vs Stream 的内存差异
// ============================================================
console.log('\n📌 6. Buffer vs Stream 内存对比\n');

console.log('  ┌──────────────┬────────────────────┬────────────────────┐');
console.log('  │              │     Buffer         │     Stream         │');
console.log('  ├──────────────┼────────────────────┼────────────────────┤');
console.log('  │ 内存占用     │ = 文件大小          │ ≈ 64KB（固定）     │');
console.log('  │ 1GB 文件     │ 占 1GB 内存 💥      │ 占 64KB 内存 ✅    │');
console.log('  │ 适用场景     │ 小文件（<10MB）     │ 大文件/网络传输    │');
console.log('  │ 操作方式     │ 全部读完后处理      │ 边读边处理         │');
console.log('  └──────────────┴────────────────────┴────────────────────┘');

// 清理
await unlink(bigFilePath);
await unlink(gzipPath);

console.log('\n✅ 文件系统学习完成！');
