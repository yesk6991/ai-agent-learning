// 💡 学习要点：检索器是 RAG 的"搜索引擎"
// 它把用户的问题和知识库中的文档片段做相似度匹配，找出最相关的内容
//
// 核心流程：
// 1. 将用户问题向量化
// 2. 与知识库中所有向量计算相似度
// 3. 返回 Top-K 最相似的结果

import { Store } from './store.js';
import { TFIDFEmbedder } from './embedder.js';
import { chunk } from './chunker.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 余弦相似度
 *
 * 💡 最常用的向量相似度计算方法
 * 衡量两个向量方向的相似性，值域 [-1, 1]
 *
 * cos(A, B) = (A·B) / (|A| × |B|)
 *
 * - 1: 方向完全相同（最相似）
 * - 0: 正交（无关）
 * - -1: 方向相反（最不相似）
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error(`向量维度不匹配: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;   // 点积 A·B
  let normA = 0;        // |A|
  let normB = 0;        // |B|

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  // 💡 防止除零：如果某个向量是零向量，相似度为 0
  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

// 全局存储，整个 Agent 共享一个知识库
let globalStore = null;
let globalEmbedder = null;

/**
 * 初始化知识库
 *
 * 💡 在 Agent 启动时调用一次，完成：
 * 1. 加载知识库文档
 * 2. 文档分块
 * 3. 向量化（计算 TF-IDF）
 * 4. 存入向量存储
 *
 * @param {string[]} docPaths - 文档文件路径数组
 */
export async function initKnowledgeBase(docPaths) {
  globalStore = new Store();
  globalEmbedder = new TFIDFEmbedder();

  // 默认加载内置知识库
  const paths = docPaths || [
    resolve(__dirname, '../../../knowledge-base/ai-basics.md'),
    resolve(__dirname, '../../../knowledge-base/prompt-guide.md'),
    resolve(__dirname, '../../../knowledge-base/rag-intro.md'),
  ];

  const allChunks = [];
  const allTexts = [];

  // 加载并分块
  for (const path of paths) {
    try {
      const text = readFileSync(path, 'utf-8');
      const chunks = chunk(text, { strategy: 'auto', chunkSize: 600, overlap: 80 });

      for (const c of chunks) {
        allChunks.push({
          ...c,
          source: path.split('/').pop(),
        });
        allTexts.push(c.content);
      }
    } catch (err) {
      console.warn(`⚠️  加载文档失败: ${path}`, err.message);
    }
  }

  // 向量化
  globalEmbedder.fit(allTexts);

  // 存入向量存储
  for (const c of allChunks) {
    const vector = globalEmbedder.transform(c.content);
    globalStore.add({
      content: c.content,
      vector,
      metadata: {
        source: c.source,
        index: c.index,
      },
    });
  }

  console.log(`📚 知识库已加载: ${allChunks.length} 个文档块, 向量维度: ${globalEmbedder.dimension}`);

  return {
    chunkCount: allChunks.length,
    dimension: globalEmbedder.dimension,
  };
}

/**
 * 检索相关文档
 *
 * 💡 这是 RAG 的核心查询接口
 * 1. 将用户问题向量化
 * 2. 与存储中所有向量计算余弦相似度
 * 3. 按相似度排序，返回 Top-K
 *
 * @param {string} query - 用户查询
 * @param {object} options
 * @param {number} options.topK - 返回最相似的 K 个结果
 * @param {number} options.minScore - 最低相似度阈值
 * @returns {Array<{content: string, score: number, metadata: object}>}
 */
export function retrieve(query, { topK = 3, minScore = 0.01 } = {}) {
  if (!globalStore || !globalEmbedder) {
    throw new Error('知识库未初始化，请先调用 initKnowledgeBase()');
  }

  // 1. 向量化查询
  const queryVector = globalEmbedder.transform(query);

  // 2. 检索所有文档并计算相似度
  const allDocs = globalStore.getAll();
  const scored = allDocs.map(doc => ({
    content: doc.content,
    score: cosineSimilarity(queryVector, doc.vector),
    metadata: doc.metadata,
  }));

  // 3. 按相似度降序排序
  scored.sort((a, b) => b.score - a.score);

  // 4. 过滤低于阈值的结果，返回 Top-K
  return scored
    .filter(d => d.score >= minScore)
    .slice(0, topK);
}

/**
 * 获取知识库状态
 */
export function getStatus() {
  if (!globalStore) return { initialized: false };
  return {
    initialized: true,
    chunkCount: globalStore.size,
    dimension: globalEmbedder?.dimension || 0,
  };
}

export { cosineSimilarity };
