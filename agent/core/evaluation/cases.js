// 💡 学习要点：评测用例是"测试驱动开发"在 AI 领域的体现
// 就像前端有单元测试一样，AI 应用也需要"测试集"
// 每个用例包含：输入问题、预期输出/关键词、评测指标

/**
 * 评测用例库
 *
 * 💡 好的评测用例应该：
 * 1. 覆盖不同难度：简单/中等/困难
 * 2. 覆盖不同场景：知识问答/代码生成/创意写作
 * 3. 包含边界情况：超长问题/多语言/格式要求
 * 4. 有明确的评分标准
 */
export const evalCases = [
  // ========== Prompt 技巧评测 ==========
  {
    id: 'prompt_zero_shot',
    category: 'prompt',
    difficulty: 'easy',
    description: '测试 Zero-shot 基础问答能力',
    input: '什么是 JavaScript 的闭包？用一句话解释。',
    expected: '闭包是指函数能够访问其外部作用域中变量的能力，即使外部函数已经执行完毕。',
    keywords: ['闭包', '函数', '作用域', '变量'],
    lengthRange: { min: 20, max: 200 },
  },
  {
    id: 'prompt_cot',
    category: 'prompt',
    difficulty: 'medium',
    description: '测试 CoT 推理能力',
    input: '一个水池有两个进水管，A 管 3 小时注满，B 管 5 小时注满。同时打开两管，几小时注满？',
    expected: '15/8 小时（约1.875小时）',
    keywords: ['1/3', '1/5', '8/15', '15/8', '1.875'],
    lengthRange: { min: 30, max: 500 },
  },
  {
    id: 'prompt_structured',
    category: 'prompt',
    difficulty: 'medium',
    description: '测试结构化输出能力',
    input: '请用 JSON 格式列出 3 种排序算法的名称和时间复杂度',
    requiredFields: ['name', 'timeComplexity'],
    keywords: ['排序', 'JSON'],
    lengthRange: { min: 50, max: 500 },
  },

  // ========== RAG 知识库评测 ==========
  {
    id: 'rag_basic',
    category: 'rag',
    difficulty: 'easy',
    description: '测试 RAG 基础知识检索',
    input: 'RAG 的全称是什么？它解决什么问题？',
    keywords: ['Retrieval', 'Augmented', 'Generation', '检索', '增强', '生成', '知识过时', '幻觉'],
    lengthRange: { min: 50, max: 500 },
  },
  {
    id: 'rag_chunking',
    category: 'rag',
    difficulty: 'medium',
    description: '测试 RAG 分块策略知识',
    input: '文档分块有哪些策略？各自的优缺点是什么？',
    keywords: ['固定大小', '语义', '递归', '重叠', 'overlap'],
    lengthRange: { min: 80, max: 800 },
  },
  {
    id: 'rag_embedding',
    category: 'rag',
    difficulty: 'medium',
    description: '测试向量化知识',
    input: '什么是文本向量化(Embedding)？余弦相似度怎么计算？',
    keywords: ['向量', '余弦', '相似度', '语义', 'TF-IDF'],
    lengthRange: { min: 60, max: 600 },
  },

  // ========== Agent 综合评测 ==========
  {
    id: 'agent_tool_use',
    category: 'agent',
    difficulty: 'easy',
    description: '测试 Agent 工具调用能力',
    input: '北京今天天气怎么样？',
    keywords: ['北京', '天气'],
    lengthRange: { min: 10, max: 200 },
  },
  {
    id: 'agent_calc',
    category: 'agent',
    difficulty: 'easy',
    description: '测试 Agent 计算器调用',
    input: '帮我计算 (125 + 375) * 2',
    keywords: ['1000'],
    lengthRange: { min: 5, max: 200 },
  },
  {
    id: 'agent_rag_combined',
    category: 'agent',
    difficulty: 'hard',
    description: '测试 Agent 串联 RAG + 工具的综合能力',
    input: '什么是 Prompt Engineering？现在几点了？',
    keywords: ['Prompt', '提示词', '时间'],
    lengthRange: { min: 50, max: 800 },
  },
];

/**
 * 按分类获取用例
 */
export function getCasesByCategory(category) {
  return evalCases.filter(c => c.category === category);
}

/**
 * 按难度获取用例
 */
export function getCasesByDifficulty(difficulty) {
  return evalCases.filter(c => c.difficulty === difficulty);
}

/**
 * 获取所有分类
 */
export function getCategories() {
  return [...new Set(evalCases.map(c => c.category))];
}
