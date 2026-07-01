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
   * 批量添加
   */
  addBatch(docs) {
    return docs.map(doc => this.add(doc));
  }

  /**
   * 按元数据过滤
   */
  filterByMetadata(predicate) {
    return this.documents.filter(d => predicate(d.metadata));
  }

  /**
   * 向量相似度检索
   * 用余弦相似度在所有文档中找与 queryVector 最相似的 topK 个
   *
   * @param {number[]} queryVector - 查询向量
   * @param {object} options
   * @param {number} options.topK - 返回最相似的 K 个结果
   * @param {number} options.minScore - 最低相似度阈值
   * @returns {Array<{id: number, content: string, score: number, metadata: object}>}
   */
  search(queryVector, { topK = 3, minScore = 0.01 } = {}) {
    const scored = this.documents
      .map(doc => ({
        id: doc.id,
        content: doc.content,
        score: cosineSimilarity(queryVector, doc.vector),
        metadata: doc.metadata,
      }))
      .filter(d => d.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }
}

/**
 * 余弦相似度
 * 衡量两个向量方向的相似性，值域 [-1, 1]
 * 1 = 方向完全相同，0 = 无关，-1 = 方向相反
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error(`向量维度不匹配: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}
