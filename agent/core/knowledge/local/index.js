// RAG 本地实现 - 统一入口
export { chunk, fixedSizeChunk, semanticChunk } from './chunker.js';
export { TFIDFEmbedder } from './embedder.js';
export { initKnowledgeBase, retrieve, getStatus } from './retriever.js';
export { Store } from './store.js';

// cosineSimilarity 私有于 store.js，外部需要时走 Store.search()
// demo-rag.js 可直接 import { Store } 后用实例方法
