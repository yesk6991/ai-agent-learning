// 💡 评测 (Evaluation) 演示
// 运行: node agent/demos/demo-evaluation.js
//
// 本演示展示了 AI 输出评测的完整流程：
// 评测指标 → 用例运行 → 报告生成

import { evaluateAnswer, stringSimilarity, keywordHitRate, jsonFormatCheck } from '../core/evaluation/metrics.js';
import { evalCases, getCategories } from '../core/evaluation/cases.js';
import { EvalRunner } from '../core/evaluation/runner.js';

console.log('='.repeat(60));
console.log('📊 评测 (Evaluation) 演示');
console.log('='.repeat(60));

// ========== 1. 评测指标演示 ==========
console.log('\n📏 Step 1: 评测指标\n');

// 字符串相似度
console.log('🔹 字符串相似度 (Levenshtein):');
const simTests = [
  ['RAG 是检索增强生成技术', 'RAG 是检索增强生成'],
  ['今天天气很好', '明天天气不好'],
  ['JavaScript 闭包', 'JavaScript 闭包'],
];
for (const [a, b] of simTests) {
  console.log(`  "${a}" vs "${b}" → ${stringSimilarity(a, b).toFixed(3)}`);
}

// 关键词命中率
console.log('\n🔹 关键词命中率:');
const kwTests = [
  { actual: 'RAG 全称是 Retrieval-Augmented Generation，解决知识过时问题', keywords: ['Retrieval', 'Augmented', 'Generation', '知识过时'] },
  { actual: 'RAG 是一种技术', keywords: ['Retrieval', 'Augmented', 'Generation'] },
];
for (const { actual, keywords } of kwTests) {
  const rate = keywordHitRate(actual, keywords);
  console.log(`  文本: "${actual}"`);
  console.log(`  关键词: [${keywords.join(', ')}] → 命中率: ${(rate * 100).toFixed(0)}%`);
}

// JSON 格式检查
console.log('\n🔹 JSON 格式检查:');
const jsonTests = [
  { input: '{"name": "张三", "age": 25}', fields: ['name', 'age', 'email'] },
  { input: '不是 JSON', fields: ['name'] },
];
for (const { input, fields } of jsonTests) {
  const check = jsonFormatCheck(input, fields);
  console.log(`  输入: ${input.slice(0, 40)}`);
  console.log(`  合法JSON: ${check.isValid} | 必需字段齐全: ${check.hasAllFields} | 缺失: [${check.missingFields.join(', ')}]`);
}

// ========== 2. 综合评测演示 ==========
console.log('\n\n📏 Step 2: 综合评测\n');

const testCases = [
  {
    label: '好的回答',
    actual: 'RAG 全称是 Retrieval-Augmented Generation（检索增强生成），它解决了 LLM 的知识过时和幻觉问题。核心流程包括索引、检索、生成三个阶段。',
    expected: 'RAG 是 Retrieval-Augmented Generation，解决知识过时和幻觉问题',
    keywords: ['Retrieval', 'Augmented', 'Generation', '检索', '幻觉'],
  },
  {
    label: '差的回答',
    actual: 'RAG 是一种技术。',
    expected: 'RAG 是 Retrieval-Augmented Generation，解决知识过时和幻觉问题',
    keywords: ['Retrieval', 'Augmented', 'Generation', '检索', '幻觉'],
  },
];

for (const tc of testCases) {
  console.log(`\n🔹 ${tc.label}:`);
  console.log(`  回答: "${tc.actual}"`);
  const result = evaluateAnswer({
    actual: tc.actual,
    expected: tc.expected,
    keywords: tc.keywords,
  });
  for (const [key, val] of Object.entries(result)) {
    console.log(`  ${key}: ${(val.score * 100).toFixed(0)}分 - ${val.description}`);
  }
}

// ========== 3. 评测用例展示 ==========
console.log('\n\n📋 Step 3: 评测用例库\n');
console.log(`共 ${evalCases.length} 个用例，分类: ${getCategories().join(', ')}\n`);
for (const c of evalCases) {
  console.log(`  [${c.category}/${c.difficulty}] ${c.id}: ${c.description}`);
}

// ========== 4. 运行评测（使用 Mock Agent）==========
console.log('\n\n' + '='.repeat(60));
console.log('🏃 Step 4: 运行评测');
console.log('='.repeat(60));

// 用一个简单的 Mock Agent 来演示评测流程
const mockAgent = async (input) => {
  // 模拟不同质量的回答
  if (input.includes('RAG')) {
    return 'RAG（Retrieval-Augmented Generation）是检索增强生成技术，通过先检索相关文档再生成回答，解决 LLM 的知识过时和幻觉问题。';
  }
  if (input.includes('天气')) {
    return '北京今天天气晴朗，温度28°C。';
  }
  if (input.includes('计算')) {
    return '计算结果是 1000。';
  }
  return '这是一个模拟回答，配置 API Key 后将获得真实 AI 回复。';
};

const runner = new EvalRunner(mockAgent);
const report = await runner.runAll('prompt');

console.log('\n\n✅ 评测演示完成！');
