// 💡 学习要点：评测运行器是自动化评测的引擎
// 它把"评测用例"和"评测指标"串联起来：
// 1. 遍历用例 → 2. 执行 Agent → 3. 评测输出 → 4. 生成报告

import { evaluateAnswer } from './metrics.js';
import { evalCases, getCasesByCategory } from './cases.js';

/**
 * 评测运行器
 *
 * 💡 设计思路：
 * - runner 不关心 Agent 怎么实现，只关心输入和输出
 * - 通过 agentFn 参数注入 Agent 执行函数（依赖反转）
 * - 输出结构化报告，便于分析和对比
 */
export class EvalRunner {
  /**
   * @param {function} agentFn - Agent 执行函数：(input) => Promise<string>
   */
  constructor(agentFn) {
    this.agentFn = agentFn;
    this.results = [];
  }

  /**
   * 运行单个评测用例
   */
  async runSingle(evalCase) {
    console.log(`\n🧪 运行: ${evalCase.id} (${evalCase.description})`);

    const startTime = Date.now();
    let actual = '';
    let error = null;

    try {
      actual = await this.agentFn(evalCase.input);
    } catch (err) {
      error = err.message;
      console.log(`  ❌ 执行出错: ${error}`);
    }

    const duration = Date.now() - startTime;

    // 评测输出
    const metrics = error ? null : evaluateAnswer({
      actual,
      expected: evalCase.expected,
      keywords: evalCase.keywords,
      requiredFields: evalCase.requiredFields,
      lengthRange: evalCase.lengthRange,
    });

    const result = {
      id: evalCase.id,
      category: evalCase.category,
      difficulty: evalCase.difficulty,
      input: evalCase.input,
      actual: actual?.slice(0, 200),
      error,
      duration,
      metrics,
    };

    if (metrics) {
      const score = (metrics.overall?.score * 100).toFixed(0);
      console.log(`  ✅ 综合得分: ${score}/100 (${duration}ms)`);
    }

    this.results.push(result);
    return result;
  }

  /**
   * 批量运行评测
   *
   * 💡 按分类过滤，方便针对某个模块单独评测
   */
  async runAll(category = null) {
    const cases = category ? getCasesByCategory(category) : evalCases;
    console.log(`\n📊 开始评测，共 ${cases.length} 个用例${category ? ` (${category} 分类)` : ''}`);
    console.log('='.repeat(50));

    this.results = [];
    for (const c of cases) {
      await this.runSingle(c);
    }

    return this.generateReport();
  }

  /**
   * 生成评测报告
   *
   * 💡 好的评测报告应该包含：
   * - 总体通过率和平均分
   * - 按分类/难度的细分统计
   * - 失败用例的详情
   */
  generateReport() {
    const total = this.results.length;
    const successResults = this.results.filter(r => !r.error);
    const failedResults = this.results.filter(r => r.error);

    const avgScore = successResults.length > 0
      ? successResults.reduce((sum, r) => sum + (r.metrics?.overall?.score || 0), 0) / successResults.length
      : 0;

    // 按分类统计
    const byCategory = {};
    for (const r of successResults) {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r.metrics?.overall?.score || 0);
    }

    const categoryStats = {};
    for (const [cat, scores] of Object.entries(byCategory)) {
      categoryStats[cat] = {
        count: scores.length,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      };
    }

    const report = {
      summary: {
        total,
        passed: successResults.length,
        failed: failedResults.length,
        passRate: total > 0 ? successResults.length / total : 0,
        avgScore,
      },
      byCategory: categoryStats,
      details: this.results,
    };

    // 打印摘要
    console.log('\n' + '='.repeat(50));
    console.log('📋 评测报告');
    console.log('='.repeat(50));
    console.log(`总计: ${total} | 通过: ${successResults.length} | 失败: ${failedResults.length}`);
    console.log(`平均分: ${(avgScore * 100).toFixed(1)}/100`);
    console.log(`通过率: ${(report.summary.passRate * 100).toFixed(0)}%`);

    for (const [cat, stats] of Object.entries(categoryStats)) {
      console.log(`  ${cat}: ${(stats.avgScore * 100).toFixed(1)} 分 (${stats.count} 用例)`);
    }

    return report;
  }
}
