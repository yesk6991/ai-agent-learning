// 💡 学习要点：技能注册中心是 Agent 工具管理的核心
// - 统一注册所有技能，方便管理和发现
// - 自动生成 Anthropic API 需要的 Tool Schema 数组
// - 运行时根据模型返回的 tool_use 名称，找到对应执行函数

import { weatherTool } from './definitions/weather.js';
import { calculatorTool } from './definitions/calculator.js';
import { searchTool } from './definitions/search.js';
import { timerTool } from './definitions/timer.js';

/**
 * 技能注册中心
 *
 * 💡 设计模式：注册表模式 (Registry Pattern)
 * - 技能定义与技能管理解耦
 * - 新增技能只需：1) 写定义文件 2) 在这里注册
 * - 上层代码通过 registry 访问，无需关心具体实现
 */
class SkillRegistry {
  constructor() {
    this.skills = new Map();
  }

  /**
   * 注册一个技能
   * @param {object} tool - { schema, execute }
   */
  register(tool) {
    if (!tool.schema?.name) {
      throw new Error('技能必须包含 schema.name');
    }
    if (typeof tool.execute !== 'function') {
      throw new Error('技能必须包含 execute 函数');
    }
    this.skills.set(tool.schema.name, tool);
  }

  /**
   * 获取 Anthropic API 需要的 tools 数组
   *
   * 💡 这是注册中心的核心价值：
   * 各个技能定义了自己的 schema，
   * 注册中心把它们汇总成 API 需要的格式
   */
  getSchemas() {
    return Array.from(this.skills.values()).map(s => s.schema);
  }

  /**
   * 根据名称获取技能
   */
  get(name) {
    return this.skills.get(name);
  }

  /**
   * 执行指定技能
   */
  async execute(name, input) {
    const skill = this.skills.get(name);
    if (!skill) {
      return `错误：未知技能 "${name}"`;
    }
    return await skill.execute(input);
  }

  /**
   * 列出所有已注册技能
   */
  list() {
    return Array.from(this.skills.values()).map(s => ({
      name: s.schema.name,
      description: s.schema.description,
    }));
  }

  /**
   * 获取技能数量
   */
  get size() {
    return this.skills.size;
  }
}

// 创建全局注册中心并注册所有内置技能
export const registry = new SkillRegistry();

registry.register(weatherTool);
registry.register(calculatorTool);
registry.register(searchTool);
registry.register(timerTool);

export { SkillRegistry };
