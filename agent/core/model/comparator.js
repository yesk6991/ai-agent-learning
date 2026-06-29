// 💡 学习要点：A/B 对比实验是模型选型的终极武器
// 同一个问题发给不同模型，对比输出质量、Token 消耗、延迟
// 用数据说话，而不是"我觉得这个模型更好"

import { callLLM } from '../llm.js';
import { modelProfiles } from './profiles.js';

/**
 * A/B 对比实验
 *
 * 💡 使用方法：
 * 1. 准备一组测试问题
 * 2. 对每个问题，分别用不同模型调用
 * 3. 记录输出、Token 用量、延迟
 * 4. 生成对比报告
 */
export async function compareModelsOnQuestion(question, modelIds = null) {
  // 默认对比三个层级
  const models = modelIds || Object.keys(modelProfiles);
  const results = [];

  for (const modelId of models) {
    const profile = modelProfiles[modelId];
    if (!profile) {
      console.warn(`⚠️  未知模型: ${modelId}`);
      continue;
    }

    console.log(`\n🔍 测试模型: ${profile.name}`);

    const startTime = Date.now();
    let response = null;
    let error = null;

    try {
      response = await callLLM({
        messages: [{ role: 'user', content: question }],
        model: modelId,
        max_tokens: 1024,
      });
    } catch (err) {
      error = err.message;
    }

    const duration = Date.now() - startTime;

    const result = {
      modelId,
      modelName: profile.name,
      tier: profile.tier,
      duration,
      error,
      output: null,
      usage: null,
    };

    if (response && !error) {
      result.output = response.content
        ?.filter(b => b.type === 'text')
        .map(b => b.text)
        .join('') || '';
      result.usage = response.usage;
    }

    results.push(result);
  }

  // 生成对比报告
  return generateComparisonReport(question, results);
}

/**
 * 生成对比报告
 */
function generateComparisonReport(question, results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 模型对比报告');
  console.log('='.repeat(60));
  console.log(`问题: ${question.slice(0, 80)}...`);
  console.log('');

  for (const r of results) {
    if (r.error) {
      console.log(`❌ ${r.modelName}: 错误 - ${r.error}`);
      continue;
    }

    const inputTokens = r.usage?.input_tokens || '?';
    const outputTokens = r.usage?.output_tokens || '?';
    const cost = r.usage
      ? `$${((inputTokens * modelProfiles[r.modelId].cost.input_per_million / 1_000_000) +
          (outputTokens * modelProfiles[r.modelId].cost.output_per_million / 1_000_000)).toFixed(5)}`
      : '?';

    console.log(`📝 ${r.modelName} (${r.tier})`);
    console.log(`   延迟: ${r.duration}ms | Tokens: ${inputTokens}→${outputTokens} | 成本: ${cost}`);
    console.log(`   输出: ${r.output?.slice(0, 100)}...`);
    console.log('');
  }

  return { question, results };
}
