// 💡 学习要点：向量化(Embedding)是 RAG 的核心
// 把文本转换为数值向量，让"语义相近的文本在向量空间中距离也近"
//
// 本文件实现了基于 TF-IDF 的本地向量化方案：
// - 不需要调用外部 API（OpenAI Embeddings 等）
// - 纯 JavaScript 实现，零额外依赖
// - 适合学习 RAG 的核心原理
//
// 生产环境建议使用专业 Embedding 模型：
// - OpenAI: text-embedding-3-small (1536 维)
// - 开源: BGE、M3E、GTE (768-1024 维)

/**
 * 中文分词器（简易版）
 *
 * 💡 真实的中文分词需要 NLP 模型（如 jieba）
 * 这里用简单的字符级处理：
 * - 去除标点符号
 * - 按字符 bigram（相邻两字组合）提取特征
 *
 * 为什么用 bigram？
 * - 单字：语义太弱，"大"和"家"分开没有意义
 * - bigram："大家"作为一个特征，语义更强
 * - trigram：更好但维度更高，对小数据集容易过拟合
 */
function tokenize(text) {
  // 去除标点和特殊字符，保留中英文和数字
  const cleaned = text.replace(/[^一-龥a-zA-Z0-9\s]/g, ' ');

  // 提取英文单词
  const englishWords = cleaned.match(/[a-zA-Z]{2,}/g) || [];

  // 提取中文 bigram
  const chineseBigrams = [];
  const chineseChars = cleaned.match(/[一-龥]+/g) || [];
  for (const segment of chineseChars) {
    for (let i = 0; i < segment.length - 1; i++) {
      chineseBigrams.push(segment.slice(i, i + 2));
    }
  }

  // 合并，全部小写
  return [...englishWords.map(w => w.toLowerCase()), ...chineseBigrams];
}

/**
 * 计算 TF（词频）
 *
 * 💡 TF = 某个词在文档中出现的次数 / 文档总词数
 * 衡量一个词在单个文档中的重要程度
 */
function computeTF(tokens) {
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }

  const total = tokens.length || 1; // 防止除零
  for (const key of Object.keys(tf)) {
    tf[key] /= total;
  }

  return tf;
}

/**
 * 计算 IDF（逆文档频率）
 *
 * 💡 IDF = log(总文档数 / 包含该词的文档数)
 * 衡量一个词在所有文档中的稀有程度
 * - 出现在所有文档中的词（如"的"）IDF 低 → 不重要
 * - 只出现在少数文档中的词 IDF 高 → 重要
 */
function computeIDF(documents) {
  const N = documents.length;
  const df = {}; // 文档频率：包含该词的文档数

  for (const tokens of documents) {
    const unique = new Set(tokens);
    for (const token of unique) {
      df[token] = (df[token] || 0) + 1;
    }
  }

  const idf = {};
  for (const [token, count] of Object.entries(df)) {
    idf[token] = Math.log((N + 1) / (count + 1)) + 1; // +1 平滑
  }

  return idf;
}

/**
 * TF-IDF 向量化器
 *
 * 💡 TF-IDF = TF × IDF
 * 综合考虑"词在当前文档的重要度"和"词在全局的稀有度"
 *
 * 局限性：
 * - 基于词频，不理解语义（"开心"和"快乐"被视为无关）
 * - 维度 = 词表大小，向量稀疏
 * - 适合小规模知识库，大规模场景请用 Embedding 模型
 */
export class TFIDFEmbedder {
  constructor() {
    this.idf = null;      // IDF 权重，在 fit 时计算
    this.vocab = null;    // 词表（所有出现过的 token）
    this.isFitted = false;
  }

  /**
   * 训练：基于文档集计算 IDF
   * 💡 相当于"建立索引"，只在知识库更新时执行
   */
  fit(documents) {
    const tokenizedDocs = documents.map(doc => tokenize(doc));
    this.idf = computeIDF(tokenizedDocs);
    this.vocab = Object.keys(this.idf).sort(); // 排序确保向量维度一致
    this.isFitted = true;
    return this;
  }

  /**
   * 将文本转换为 TF-IDF 向量
   * 💡 输出是一个固定长度的数值数组，长度 = 词表大小
   */
  transform(text) {
    if (!this.isFitted) throw new Error('请先调用 fit() 方法');

    const tokens = tokenize(text);
    const tf = computeTF(tokens);

    // 💡 向量的每个维度对应词表中的一个 token
    // 值 = TF × IDF，未出现的词值为 0
    const vector = this.vocab.map(token => {
      return (tf[token] || 0) * (this.idf[token] || 0);
    });

    return vector;
  }

  /**
   * 批量向量化
   */
  transformBatch(texts) {
    return texts.map(text => this.transform(text));
  }

  /**
   * fit + transform 一步完成
   */
  fitTransform(documents) {
    this.fit(documents);
    return this.transformBatch(documents);
  }

  /**
   * 获取词表大小（向量维度）
   */
  get dimension() {
    return this.vocab?.length || 0;
  }
}
