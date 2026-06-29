// 💡 模型选型演示
// 运行: node agent/demos/demo-model.js
//
// 本演示展示了模型选型的决策过程：
// 模型画像 → 任务分析 → 智能推荐 → 成本估算

import { modelProfiles, listModels, estimateCost } from '../core/model/profiles.js';
import { selectModel, compareModels } from '../core/model/selector.js';

console.log('='.repeat(60));
console.log('🤖 模型选型演示');
console.log('='.repeat(60));

// ========== 1. 模型画像展示 ==========
console.log('\n📊 Step 1: 模型画像\n');

for (const [id, profile] of Object.entries(modelProfiles)) {
  console.log(`🔹 ${profile.name} (${profile.tier})`);
  console.log(`  描述: ${profile.description}`);
  console.log(`  能力: 通用=${profile.capabilities.general} 推理=${profile.capabilities.reasoning} 编码=${profile.capabilities.coding} 创意=${profile.capabilities.creative}`);
  console.log(`  成本: $${profile.cost.input_per_million}/M input, $${profile.cost.output_per_million}/M output`);
  console.log(`  延迟: ~${profile.latency.typical}s`);
  console.log(`  适合: ${profile.bestFor.join('、')}`);
  console.log();
}

// ========== 2. 智能选型演示 ==========
console.log('\n🎯 Step 2: 智能模型选择\n');

const testInputs = [
  '请把以下英文翻译成中文: Hello World',
  '请解释什么是 React Hooks，并举几个常用 Hooks 的例子',
  '请设计一个电商系统的微服务架构方案，考虑高并发和一致性',
];

for (const input of testInputs) {
  const selection = selectModel(input);
  console.log(`❓ "${input}"`);
  console.log(`   任务类型: ${selection.taskType}`);
  console.log(`   推荐模型: ${selection.recommendedModel}`);
  console.log(`   理由: ${selection.reason}`);
  console.log();
}

// ========== 3. 成本估算 ==========
console.log('\n💰 Step 3: 成本估算\n');

const scenarios = [
  { name: '短对话', input: 200, output: 100 },
  { name: '中等对话', input: 1000, output: 500 },
  { name: '长文档分析', input: 5000, output: 2000 },
  { name: 'Agent 多轮', input: 10000, output: 5000 },
];

for (const scenario of scenarios) {
  console.log(`${scenario.name} (${scenario.input} input + ${scenario.output} output tokens):`);
  for (const [modelId, profile] of Object.entries(modelProfiles)) {
    const cost = estimateCost(modelId, scenario.input, scenario.output);
    console.log(`  ${profile.name}: $${cost.totalCost}`);
  }
  console.log();
}

// ========== 4. 选型决策树 ==========
console.log('\n🌳 Step 4: 选型决策树\n');
console.log(`
  任务简单？───────────────── 是 ──→ Haiku（快+省钱）
      │
      否
      │
  任务中等？───────────────── 是 ──→ Sonnet（均衡）
      │
      否
      │
  预算充足 + 不急？── 是 ──→ Opus（最强）
      │
      否
      │
  降级到 Sonnet（性价比之选）
`);

// ========== 5. 成本对比 ==========
console.log('\n📈 Step 5: 1000 次调用的月度成本对比\n');
console.log('假设每次调用: 1000 input + 500 output tokens');
console.log('');

const monthlyCalls = 1000;
const inputPerCall = 1000;
const outputPerCall = 500;

for (const [modelId, profile] of Object.entries(modelProfiles)) {
  const perCallCost = estimateCost(modelId, inputPerCall, outputPerCall);
  const monthlyCost = (parseFloat(perCallCost.totalCost) * monthlyCalls).toFixed(2);
  console.log(`  ${profile.name}: $${monthlyCost}/月`);
}

console.log('\n\n✅ 模型选型演示完成！');
