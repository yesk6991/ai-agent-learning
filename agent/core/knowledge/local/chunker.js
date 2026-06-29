// 💡 学习要点：文档分块是 RAG 的第一步，也是最影响效果的一步
// - 太大的块：检索不精确，可能包含大量无关内容
// - 太小的块：丢失上下文，语义不完整
// - 重叠(Overlap)：避免关键信息恰好在切割点被截断

/**
 * 文档分块器
 *
 * 💡 为什么需要分块？
 * 1. LLM 的上下文窗口有限，不能把整个文档塞进去
 * 2. 检索精度：小块的语义更聚焦，检索更准确
 * 3. 成本控制：只发送相关的片段，减少 Token 消耗
 */

/**
 * 按固定大小分块
 *
 * 💡 最简单的分块策略：
 * - 每 chunkSize 个字符切一刀
 * - 相邻块之间有 overlap 个字符重叠
 * - 优点：实现简单，块大小可控
 * - 缺点：可能在句子中间断开
 *
 * @param {string} text - 原始文本
 * @param {object} options
 * @param {number} options.chunkSize - 块大小（字符数），默认 500
 * @param {number} options.overlap - 重叠大小，默认 50
 * @returns {Array<{content: string, index: number}>} 分块结果
 */
export function fixedSizeChunk(text, { chunkSize = 500, overlap = 50 } = {}) {
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const content = text.slice(start, end).trim();

    if (content.length > 0) {
      chunks.push({ content, index });
      index++;
    }

    // 💡 关键：步进 = chunkSize - overlap
    // 这样相邻块会有 overlap 个字符的重叠
    start += chunkSize - overlap;

    // 防止无限循环（当 overlap >= chunkSize 时）
    if (chunkSize - overlap <= 0) break;
  }

  return chunks;
}

/**
 * 按段落分块
 *
 * 💡 语义更好的分块策略：
 * - 以空行或标题作为分界点
 * - 每个块是一个完整的段落/章节
 * - 如果段落超过 chunkSize，再用固定大小切分
 *
 * @param {string} text - 原始文本
 * @param {object} options
 * @param {number} options.chunkSize - 最大块大小
 * @param {number} options.overlap - 重叠大小
 * @returns {Array<{content: string, index: number, metadata: object}>}
 */
export function semanticChunk(text, { chunkSize = 800, overlap = 100 } = {}) {
  const chunks = [];
  let index = 0;

  // 按标题（## 开头）和空行分割
  const sections = text.split(/(?=\n#{1,3}\s)|\n\s*\n/);

  let currentChunk = '';

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // 如果当前块 + 新段落不超过限制，合并
    if (currentChunk.length + trimmed.length + 1 <= chunkSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmed}` : trimmed;
    } else {
      // 保存当前块
      if (currentChunk) {
        chunks.push({
          content: currentChunk,
          index: index++,
          metadata: { type: 'semantic' },
        });
      }

      // 如果新段落本身超过限制，用固定大小切分
      if (trimmed.length > chunkSize) {
        const subChunks = fixedSizeChunk(trimmed, { chunkSize, overlap });
        for (const sc of subChunks) {
          chunks.push({
            ...sc,
            index: index++,
            metadata: { type: 'semantic-fallback' },
          });
        }
        currentChunk = '';
      } else {
        currentChunk = trimmed;
      }
    }
  }

  // 保存最后一块
  if (currentChunk) {
    chunks.push({
      content: currentChunk,
      index: index++,
      metadata: { type: 'semantic' },
    });
  }

  return chunks;
}

/**
 * 智能分块：自动选择最佳策略
 *
 * 💡 默认使用语义分块，因为它保留了更多的上下文信息
 * 当文档没有明显的段落结构时，退化为固定大小分块
 */
export function chunk(text, options = {}) {
  const strategy = options.strategy || 'auto';

  if (strategy === 'fixed') {
    return fixedSizeChunk(text, options);
  }

  if (strategy === 'semantic') {
    return semanticChunk(text, options);
  }

  // auto：如果文本有标题或空行，用语义分块；否则固定大小
  const hasStructure = /#{1,3}\s|\n\s*\n/.test(text);
  return hasStructure
    ? semanticChunk(text, options)
    : fixedSizeChunk(text, options);
}
