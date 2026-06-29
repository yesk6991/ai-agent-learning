// 💡 学习要点：CLI 交互界面是 Agent 的"门面"
// - 基于 Node.js readline 模块实现
// - 支持命令式交互（/help /rag /model /eval 等）
// - 彩色输出，实时显示 Token 用量

import * as readline from 'readline';
import { createAgent } from './agent.js';
import { listTechniques } from './core/prompt/techniques.js';
import { listTemplates } from './core/prompt/templates.js';
import { listModels, estimateCost } from './core/model/profiles.js';
import { selectModel } from './core/model/selector.js';
import { EvalRunner } from './core/evaluation/runner.js';
import { evalCases } from './core/evaluation/cases.js';
import { getMode } from './core/llm.js';

// ANSI 颜色码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function print(text, color = '') {
  console.log(`${color}${text}${colors.reset}`);
}

function printBanner() {
  print(`
╔══════════════════════════════════════════════╗
║         🤖 AI Agent 学习助手 v1.0            ║
║                                              ║
║  模块: Prompt | RAG | 评测 | 技能 | 模型选型  ║
║  输入 /help 查看命令列表                      ║
╚══════════════════════════════════════════════╝
`, colors.cyan);
}

function printHelp() {
  print(`
📖 命令列表:

  /help          显示此帮助信息
  /status        查看 Agent 当前状态
  /rag on|off    开启/关闭 RAG 知识库检索
  /model <name>  切换模型 (haiku|sonnet|opus|auto)
  /models        列出可用模型
  /techniques    列出 Prompt 技巧
  /templates     列出 Prompt 模板
  /eval [category] 迧行评测 (prompt|rag|agent|all)
  /select <问题>  模型选型推荐
  /demo          运行分模块演示
  /clear         清屏
  /quit          退出

💡 直接输入问题即可与 Agent 对话！
`, colors.yellow);
}

async function main() {
  printBanner();

  // 创建 Agent
  const agent = await createAgent({
    name: 'AI 学习助手',
    ragEnabled: true,
    autoSelectModel: true,
  });

  const mode = getMode();
  if (mode === 'mock') {
    print('⚠️  当前为 Mock 模式，未配置 ANTHROPIC_API_KEY', colors.yellow);
    print('   配置方法：在项目根目录 .env 文件中添加 ANTHROPIC_API_KEY=your_key', colors.dim);
    print('   获取 Key：https://console.anthropic.com/', colors.dim);
    print('   Mock 模式下仍可学习 Agent 的完整流程和架构\n', colors.dim);
  }

  // 创建 readline 接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${colors.cyan}你> ${colors.reset}`,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    // 命令处理
    if (input.startsWith('/')) {
      await handleCommand(input, agent, rl);
      rl.prompt();
      return;
    }

    // 普通对话
    try {
      print('\n🤖 思考中...\n', colors.dim);
      const result = await agent.chat(input);

      print(`\n${result.text}\n`, colors.green);

      // 显示统计
      const stats = result.stats;
      if (stats) {
        print(
          `📊 迭代: ${stats.iterations} | 工具调用: ${stats.toolCalls.length} | ` +
          `Tokens: ${stats.totalInputTokens}→${stats.totalOutputTokens} | 模型: ${result.model}`,
          colors.dim,
        );
      }
      console.log();
    } catch (err) {
      print(`\n❌ 错误: ${err.message}\n`, colors.red);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    print('\n👋 再见！继续学习 AI 工程化！\n', colors.cyan);
    process.exit(0);
  });
}

async function handleCommand(input, agent, rl) {
  const [cmd, ...args] = input.slice(1).split(' ');
  const arg = args.join(' ');

  switch (cmd) {
    case 'help':
      printHelp();
      break;

    case 'status': {
      const status = agent.getStatus();
      print('\n📊 Agent 状态:', colors.cyan);
      print(`  名称: ${status.name}`);
      print(`  模式: ${status.mode}`);
      print(`  RAG: ${status.ragEnabled ? '✅ 已启用' : '❌ 已关闭'}`);
      print(`  知识库: ${status.ragStatus.chunkCount || 0} 个文档块`);
      print(`  技能: ${status.skills.map(s => s.name).join(', ')}`);
      print(`  对话数: ${status.stats.totalMessages} | 工具调用: ${status.stats.totalToolCalls}`);
      console.log();
      break;
    }

    case 'rag':
      if (arg === 'on') {
        agent.ragEnabled = true;
        print('✅ RAG 知识库检索已开启', colors.green);
      } else if (arg === 'off') {
        agent.ragEnabled = false;
        print('❌ RAG 知识库检索已关闭', colors.yellow);
      } else {
        print(`当前 RAG 状态: ${agent.ragEnabled ? '开启' : '关闭'}`, colors.cyan);
      }
      break;

    case 'model':
      if (arg === 'auto') {
        agent.model = null;
        agent.autoSelectModel = true;
        print('✅ 已切换为自动模型选型', colors.green);
      } else if (arg) {
        const modelMap = {
          haiku: 'claude-haiku-4-5-20251001',
          sonnet: 'claude-sonnet-4-6-20250514',
          opus: 'claude-opus-4-8',
        };
        const modelId = modelMap[arg] || arg;
        agent.model = modelId;
        agent.autoSelectModel = false;
        print(`✅ 已切换为模型: ${modelId}`, colors.green);
      } else {
        print(`当前模型: ${agent.model || '自动选择'}`, colors.cyan);
      }
      break;

    case 'models': {
      print('\n🤖 可用模型:', colors.cyan);
      for (const m of listModels()) {
        print(`  ${m.name} (${m.tier}) - ${m.description}`);
        print(`    适合: ${m.bestFor.join(', ')}`, colors.dim);
      }
      console.log();
      break;
    }

    case 'techniques': {
      print('\n🎯 Prompt 技巧:', colors.cyan);
      for (const t of listTechniques()) {
        print(`  ${t.name} - ${t.description}`);
      }
      console.log();
      break;
    }

    case 'templates': {
      print('\n📝 Prompt 模板:', colors.cyan);
      for (const t of listTemplates()) {
        print(`  ${t.name} (v${t.version}) - 变量: ${t.variables.join(', ')}`);
      }
      console.log();
      break;
    }

    case 'eval': {
      const category = arg || null;
      print(`\n📊 运行评测${category ? ` (${category})` : ''}...\n`, colors.cyan);

      const runner = new EvalRunner(async (input) => {
        const result = await agent.chat(input);
        return result.text;
      });

      await runner.runAll(category);
      break;
    }

    case 'select': {
      if (!arg) {
        print('用法: /select <你的问题>', colors.yellow);
        break;
      }
      const selection = selectModel(arg);
      print(`\n🤖 模型选型结果:`, colors.cyan);
      print(`  任务类型: ${selection.taskType}`);
      print(`  推荐模型: ${selection.recommendedModel} (${selection.recommendedTier})`);
      print(`  理由: ${selection.reason}`);
      print(`  其他选项: ${selection.alternatives.map(a => a.name).join(', ')}`, colors.dim);
      console.log();
      break;
    }

    case 'demo':
      print('\n🎓 运行分模块演示...', colors.cyan);
      print('  请使用以下命令单独运行各模块演示:', colors.yellow);
      print('  node agent/demos/demo-prompt.js    - Prompt 技巧演示');
      print('  node agent/demos/demo-rag.js       - RAG 知识库演示');
      print('  node agent/demos/demo-skills.js    - 技能调用演示');
      print('  node agent/demos/demo-evaluation.js - 评测演示');
      print('  node agent/demos/demo-model.js     - 模型选型演示');
      console.log();
      break;

    case 'clear':
      console.clear();
      break;

    case 'quit':
    case 'exit':
      print('\n👋 再见！继续学习 AI 工程化！\n', colors.cyan);
      process.exit(0);
      break;

    default:
      print(`未知命令: /${cmd}，输入 /help 查看帮助`, colors.red);
  }
}

main().catch(console.error);
