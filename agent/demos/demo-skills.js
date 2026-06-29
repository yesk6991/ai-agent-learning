// 💡 技能调用 (Tool Use) 演示
// 运行: node agent/demos/demo-skills.js
//
// 本演示展示了 Agent 的工具调用机制：
// 技能注册 → 模型决策 → 工具执行 → 结果回传

import { registry } from '../core/skills/registry.js';
import { runAgentLoop } from '../core/skills/executor.js';
import { callLLM } from '../core/llm.js';

console.log('='.repeat(60));
console.log('🔧 技能调用 (Tool Use) 演示');
console.log('='.repeat(60));

// ========== 1. 查看已注册技能 ==========
console.log('\n📋 已注册技能:\n');
for (const skill of registry.list()) {
  console.log(`  • ${skill.name} - ${skill.description}`);
}

// ========== 2. 直接执行技能 ==========
console.log('\n\n🏃 直接执行技能:\n');

// 天气查询
console.log('🔹 天气查询:');
const weatherResult = await registry.execute('get_weather', { city: '北京' });
console.log(`  结果: ${weatherResult}`);

// 计算器
console.log('\n🔹 计算器:');
const calcResult = await registry.execute('calculator', { expression: '(3 + 5) * 2' });
console.log(`  结果: ${calcResult}`);

// 时间查询
console.log('\n🔹 时间查询:');
const timeResult = await registry.execute('get_time', {});
console.log(`  结果: ${timeResult}`);

// ========== 3. 查看工具的 Anthropic Schema ==========
console.log('\n\n📜 工具的 API Schema（发送给模型的定义）:\n');
const schemas = registry.getSchemas();
for (const schema of schemas.slice(0, 2)) {
  console.log(`  ${schema.name}:`);
  console.log(`    描述: ${schema.description}`);
  console.log(`    参数: ${JSON.stringify(schema.input_schema.properties)}`);
  console.log(`    必需: ${schema.input_schema.required.join(', ')}`);
}

// ========== 4. Agent Loop 演示 ==========
console.log('\n\n' + '='.repeat(60));
console.log('🔄 Agent Loop 演示（完整工具调用循环）');
console.log('='.repeat(60));

const testQuestions = [
  '北京今天天气怎么样？',
  '帮我计算 (125 + 375) * 2',
  '现在几点了？',
];

for (const question of testQuestions) {
  console.log(`\n\n❓ 用户: ${question}`);
  console.log('-'.repeat(40));

  try {
    const result = await runAgentLoop({
      userMessage: question,
      system: '你是一个智能助手，可以查询天气、进行计算、获取时间。',
      onToolCall: (blocks) => {
        for (const block of blocks) {
          console.log(`  🔧 模型决定调用: ${block.name}(${JSON.stringify(block.input)})`);
        }
      },
      onToolResult: (name, result) => {
        console.log(`  ✅ 执行结果: ${result}`);
      },
    });

    console.log(`\n  💬 最终回答: ${result.text?.slice(0, 200)}`);
    console.log(`  📊 统计: ${result.stats.iterations} 轮迭代, ${result.stats.toolCalls.length} 次工具调用`);
  } catch (err) {
    console.log(`  ❌ 错误: ${err.message}`);
  }
}

console.log('\n\n✅ 技能调用演示完成！');
