// 💡 RAG 知识库检索演示
// 运行: node agent/demos/demo-rag.js
//
// 本演示展示了 RAG 的完整流程：
// 文档加载 → 分块 → 向量化 → 检索 → 结果展示

import { chunk, fixedSizeChunk, semanticChunk } from '../core/knowledge/local/chunker.js';
import { TFIDFEmbedder } from '../core/knowledge/local/embedder.js';
import { initKnowledgeBase, retrieve, getStatus } from '../core/knowledge/local/retriever.js';
import { Store } from '../core/knowledge/local/store.js';

console.log('='.repeat(60));
console.log('📚 RAG 知识库检索演示');
console.log('='.repeat(60));

// ========== 1. 文档分块演示 ==========
console.log('\n📐 Step 1: 文档分块\n');

const sampleText = `# 什么是 RAG

RAG（Retrieval-Augmented Generation）是一种让 LLM 利用外部知识的技术。它通过先检索相关文档，再生成回答的方式，解决了 LLM 的知识过时和幻觉问题。

## 核心流程

RAG 的核心流程包括三个阶段：

1. 索引阶段：将文档分块、向量化、存入向量数据库
2. 检索阶段：用户提问后，将问题向量化，通过相似度检索找到相关文档
3. 生成阶段：将检索到的文档作为上下文，让 LLM 生成回答

## 为什么需要分块

文档太长无法直接输入 LLM，需要分成小块。分块策略影响检索效果：
- 太大的块：检索不精确
- 太小的块：丢失上下文`;

console.log('原始文本长度:', sampleText.length, '字符\n');

// 固定大小分块
console.log('🔹 固定大小分块 (chunkSize=100, overlap=20):');
const fixedChunks = fixedSizeChunk(sampleText, { chunkSize: 100, overlap: 20 });
fixedChunks.forEach((c, i) => {
  console.log(`  块 ${i}: "${c.content.slice(0, 60)}..." (${c.content.length} 字)`);
});

// 语义分块
console.log('\n🔹 语义分块 (按标题和段落切分):');
const semanticChunks = semanticChunk(sampleText, { chunkSize: 200 });
semanticChunks.forEach((c, i) => {
  console.log(`  块 ${i}: "${c.content.slice(0, 60)}..." (${c.content.length} 字)`);
});

// ========== 2. 向量化演示 ==========
console.log('\n\n📊 Step 2: TF-IDF 向量化\n');

const docs = [
  'RAG 是检索增强生成技术',
  '文档分块是 RAG 的第一步',
  '向量化将文本转换为数值向量',
  '余弦相似度衡量向量方向的相似性',
];

const embedder = new TFIDFEmbedder();
embedder.fit(docs);

console.log(`词表大小（向量维度）: ${embedder.dimension}`);
console.log(`词表: ${embedder.vocab.join(', ')}\n`);

// 展示向量
const vectors = embedder.transformBatch(docs);
docs.forEach((doc, i) => {
  const nonZero = vectors[i].filter(v => v !== 0).length;
  console.log(`  "${doc}" → 向量 (${vectors[i].length}维, ${nonZero}个非零值)`);
});

// ========== 3. 相似度计算演示 ==========
console.log('\n\n🔍 Step 3: 相似度计算\n');

// 用临时 Store 来计算两段文本的相似度
const tmpStore = new Store();

const pairs = [
  ['RAG 是检索增强生成技术', '文档分块是 RAG 的第一步'],
  ['RAG 是检索增强生成技术', '今天天气真好'],
  ['向量化将文本转换为数值向量', '余弦相似度衡量向量方向的相似性'],
];

for (const [a, b] of pairs) {
  // 把 b 存入 Store，用 a 的向量去搜索
  tmpStore.clear();
  tmpStore.add({ content: b, vector: embedder.transform(b) });
  const results = tmpStore.search(embedder.transform(a), { topK: 1 });
  const sim = results[0]?.score ?? 0;
  console.log(`  "${a}" vs "${b}"`);
  console.log(`  相似度: ${sim.toFixed(4)} ${sim > 0.3 ? '✅ 相关' : '❌ 不相关'}\n`);
}

// ========== 4. 完整 RAG 检索演示 ==========
console.log('\n\n🎯 Step 4: 完整 RAG 检索流程\n');

const initResult = await initKnowledgeBase();
console.log(`知识库状态: ${initResult.chunkCount} 个文档块, ${initResult.dimension} 维向量\n`);

// 测试几个查询
const queries = [
  '什么是 RAG？',
  'Prompt 工程有哪些技巧？',
  '如何进行文档分块？',
  '什么是 Agent？',
];

for (const query of queries) {
  console.log(`\n🔎 查询: "${query}"`);
  const results = retrieve(query, { topK: 2 });
  results.forEach((r, i) => {
    console.log(`  [${i + 1}] 相似度: ${r.score.toFixed(4)} | 来源: ${r.metadata.source}`);
    console.log(`      "${r.content.slice(0, 80)}..."`);
  });
}

console.log('\n\n✅ RAG 演示完成！');
