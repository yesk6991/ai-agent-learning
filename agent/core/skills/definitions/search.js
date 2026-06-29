// 💡 学习要点：这是 Agent 各模块串联的关键
// search_knowledge_base 技能让 Agent 可以在对话中查询 RAG 知识库
// 体现了 Agent "按需行动"的核心能力

import { retrieve } from '../../knowledge/local/retriever.js';

/**
 * 知识库搜索技能
 *
 * 💡 这个技能把 RAG 模块和 Agent 的 Tool Use 模块串联起来了
 * - 用户问问题时，Agent 可以自主决定是否需要查知识库
 * - 查到相关内容后，基于检索结果生成回答
 * - 这就是 "ReAct" 范式在真实 Agent 中的体现
 */
export const searchTool = {
  schema: {
    name: 'search_knowledge_base',
    description: '在知识库中搜索相关文档。当用户的问题可能需要专业知识或特定文档内容时使用。',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词或问题',
        },
        top_k: {
          type: 'number',
          description: '返回最相关的 K 个结果，默认 3',
        },
      },
      required: ['query'],
    },
  },

  async execute({ query, top_k = 3 }) {
    try {
      const results = await retrieve(query, { topK: top_k });
      if (results.length === 0) {
        return '知识库中未找到相关内容。';
      }

      return results
        .map((r, i) => `[${i + 1}] (相似度: ${r.score.toFixed(3)}) ${r.content}`)
        .join('\n\n');
    } catch (err) {
      return `搜索出错：${err.message}`;
    }
  },
};
