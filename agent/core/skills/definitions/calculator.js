// 💡 学习要点：计算器是最经典的 Tool Use 示例
// LLM 不擅长精确数学计算，这是已知的局限
// 通过工具调用，让 LLM "委托"计算给精确的代码执行

/**
 * 计算器技能
 *
 * 💡 为什么 LLM 需要计算器？
 * - LLM 基于 Token 预测，不是真正的"计算"
 * - 大数运算、浮点运算容易出错
 * - 工具调用 = 让 LLM 发挥推理优势，把精确计算交给代码
 */
export const calculatorTool = {
  schema: {
    name: 'calculator',
    description: '执行数学计算。支持加减乘除、幂运算、括号。例如：(3 + 5) * 2',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '数学表达式，如 "2 + 3 * 4" 或 "(10 - 2) / 4"',
        },
      },
      required: ['expression'],
    },
  },

  async execute({ expression }) {
    try {
      // 💡 安全考虑：只允许数字和基本运算符
      // 真实项目中需要更严格的安全检查
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
      if (sanitized !== expression.trim()) {
        return '错误：表达式包含不允许的字符，只支持数字和 + - * / ( ) %';
      }

      // 使用 Function 构造器安全地执行数学表达式
      // 注意：这里用 new Function 比 eval 稍安全，但生产环境仍需沙箱
      const result = new Function(`return (${sanitized})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        return '错误：计算结果无效';
      }

      return `${expression} = ${result}`;
    } catch (err) {
      return `计算错误：${err.message}。请检查表达式格式。`;
    }
  },
};
