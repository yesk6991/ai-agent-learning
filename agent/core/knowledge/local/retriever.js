import { Store } from './store.js';
import { TFIDFEmbedder } from './embedder.js';
import { chunk } from './chunker.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let globalStore = null;
let globalEmbedder = null;

/**
 * 初始化知识库
 * 加载文档 → 分块 → 向量化 → 存入 Store
 */
export async function initKnowledgeBase(docPaths) {
  globalStore = new Store();
  globalEmbedder = new TFIDFEmbedder();

  const paths = docPaths || [
    resolve(__dirname, '../../../knowledge-base/ai-basics.md'),
    resolve(__dirname, '../../../knowledge-base/prompt-guide.md'),
    resolve(__dirname, '../../../knowledge-base/rag-intro.md'),
  ];

  const allChunks = [];
  const allTexts = [];

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

  // 向量化并存储
  globalEmbedder.fit(allTexts);

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
 * 将用户问题向量化 → 调用 Store 的向量检索
 */
export function retrieve(query, { topK = 3, minScore = 0.01 } = {}) {
  if (!globalStore || !globalEmbedder) {
    throw new Error('知识库未初始化，请先调用 initKnowledgeBase()');
  }

  const queryVector = globalEmbedder.transform(query);
  return globalStore.search(queryVector, { topK, minScore });
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
