// 💡 Prompt 技巧演示
// 运行: node agent/demos/demo-prompt.js
//
// 本演示展示了 6 种 Prompt 技巧的效果差异
// 即使没有 API Key（Mock 模式），也可以看到 Prompt 的构造方式

import { techniques, applyTechnique, listTechniques } from '../core/prompt/techniques.js';
import { render, listTemplates } from '../core/prompt/templates.js';
import { callLLM } from '../core/llm.js';

console.log('='.repeat(60));
console.log('🎯 Prompt Engineering 技巧演示');
console.log('='.repeat(60));

// ========== 1. 列出所有技巧 ==========
console.log('\n📋 可用的 Prompt 技巧:\n');
for (const t of listTechniques()) {
  console.log(`  • ${t.name} - ${t.description}`);
}

// ========== 2. 演示每种技巧的 Prompt 构造 ==========
const question = '什么是闭包？请举例说明。';

console.log(`\n\n以同一个问题为例: "${question}"`);
console.log('-'.repeat(40));

// Zero-shot
console.log('\n1️⃣  Zero-shot（直接提问）:');
console.log(applyTechnique('zero_shot', question));

// Few-shot
console.log('\n2️⃣  Few-shot（给出示例）:');
console.log(applyTechnique('few_shot', question, [
  { input: '什么是变量？', output: '变量是存储数据的命名容器。例如：let name = "张三";' },
  { input: '什么是函数？', output: '函数是可复用的代码块。例如：function greet(name) { return "你好" + name; }' },
]));

// CoT
console.log('\n3️⃣  Chain-of-Thought（思维链）:');
console.log(applyTechnique('chain_of_thought', question));

// ReAct
console.log('\n4️⃣  ReAct（推理+行动）:');
console.log(applyTechnique('react', question, [
  { name: 'search_knowledge_base' },
  { name: 'calculator' },
]));

// 结构化输出
console.log('\n5️⃣  结构化输出（JSON Schema）:');
console.log(applyTechnique('structured_output', question, {
  type: 'object',
  properties: {
    definition: { type: 'string', description: '概念定义' },
    example: { type: 'string', description: '代码示例' },
    keyPoints: { type: 'array', items: { type: 'string' } },
  },
  required: ['definition', 'example', 'keyPoints'],
}));

// 角色设定
console.log('\n6️⃣  角色设定（System Prompt）:');
const roleResult = applyTechnique('role_setting', {
  system: '你是一个有 10 年经验的 JavaScript 专家，擅长用简洁易懂的方式解释概念。',
}, question);
console.log('System:', roleResult.system);
console.log('User:', roleResult.user);

// ========== 3. 演示模板系统 ==========
console.log('\n\n' + '='.repeat(60));
console.log('📝 Prompt 模板演示');
console.log('='.repeat(60));

console.log('\n可用模板:');
for (const t of listTemplates()) {
  console.log(`  • ${t.name} (v${t.version}) - 变量: ${t.variables.join(', ')}`);
}

console.log('\n渲染 RAG 问答模板:');
const rendered = render('rag_qa', {
  question: '什么是 Agent？',
  references: '[1] Agent 是一种能够自主感知环境、做出决策并执行动作的 AI 系统。\n[2] Agent 具备感知、推理、行动、反思四种核心能力。',
});
console.log(rendered);

// ========== 4. 对比不同技巧的 LLM 回复（如果有 API Key）==========
console.log('\n\n' + '='.repeat(60));
console.log('🧪 对比不同技巧的 LLM 回复');
console.log('='.repeat(60));

const testQuestion = '一个长方形的长是 8 厘米，宽是 5 厘米，求面积。';
const prompts = {
  'Zero-shot': testQuestion,
  'CoT': applyTechnique('chain_of_thought', testQuestion),
};

for (const [name, prompt] of Object.entries(prompts)) {
  console.log(`\n📌 ${name}:`);
  try {
    const response = await callLLM({
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content?.find(b => b.type === 'text')?.text || '(无文本输出)';
    console.log(text.slice(0, 300));
    console.log(`\n  Tokens: ${response.usage?.input_tokens}→${response.usage?.output_tokens}`, '\x1b[2m');
  } catch (err) {
    console.log('  (调用失败:', err.message, ')');
  }
}

console.log('\n\n✅ Prompt 技巧演示完成！');
