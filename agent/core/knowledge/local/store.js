// 💡 学习要点：向量存储是 RAG 的"数据库"
// 在生产环境中，你会用到 Pinecone、Chroma、Weaviate 等专业向量数据库
// 这里用内存存储来演示核心概念，零依赖

/**
 * 内存向量存储
 *
 * 💡 为什么需要向量存储？
 * - RAG 需要快速找到与查询最相似的文档
 * - 向量数据库支持高效的相似度搜索
 * - 生产级方案支持百万级甚至亿级向量
 *
 * 本实现：
 * - 内存存储，进程结束数据消失
 * - 全量扫描计算相似度（O(n)，适合学习）
 * - 生产环境用 ANN（近似最近邻）索引，复杂度 O(log n)
 */
export class Store {
  constructor() {
    this.documents = [];
    this.nextId = 1;
  }

  /**
   * 添加文档
   * @param {object} doc - { content, vector, metadata }
   * @returns {number} 文档 ID
   */
  add(doc) {
    const id = this.nextId++;
    this.documents.push({
      id,
      content: doc.content,
      vector: doc.vector,
      metadata: doc.metadata || {},
    });
    return id;
  }

  /**
   * 获取所有文档
   */
  getAll() {
    return this.documents.map(d => ({ ...d }));
  }

  /**
   * 根据 ID 获取文档
   */
  getById(id) {
    return this.documents.find(d => d.id === id) || null;
  }

  /**
   * 删除文档
   */
  remove(id) {
    const index = this.documents.findIndex(d => d.id === id);
    if (index === -1) return false;
    this.documents.splice(index, 1);
    return true;
  }

  /**
   * 清空存储
   */
  clear() {
    this.documents = [];
    this.nextId = 1;
  }

  /**
   * 获取文档数量
   */
  get size() {
    return this.documents.length;
  }

  /**
   * 💡 进阶方法：批量添加
   * 在真实场景中，批量操作可以优化性能
   */
  addBatch(docs) {
    return docs.map(doc => this.add(doc));
  }

  /**
   * 💡 进阶方法：按元数据过滤
   * 支持 "只在某个来源的文档中搜索"
   */
  filterByMetadata(predicate) {
    return this.documents.filter(d => predicate(d.metadata));
  }
}
