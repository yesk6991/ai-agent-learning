// 💡 学习要点：Prompt 模板化是工程化的第一步
// - 将 Prompt 从"手写"升级为"模板+变量"
// - 支持版本管理，便于 A/B 测试
// - 团队协作的基础

/**
 * Prompt 模板系统
 *
 * 💡 模板语法：{{variable}}
 * - 双花括号包裹变量名
 * - 渲染时替换为实际值
 * - 支持嵌套对象路径：{{config.model}}
 */

/**
 * 内置的 Prompt 模板库
 * 每个模板有：name、version、template、variables
 */
export const templates = {
  /**
   * 模板：通用问答
   */
  qa: {
    name: '通用问答',
    version: '1.0',
    template: `请回答以下问题。

      {{#if context}}
      参考资料：
      ---
      {{context}}
      ---
      {{/if}}

      问题：{{question}}

      要求：
      - 回答准确、清晰
      - 如有参考资料，优先基于资料回答
      - 如不确定，请明确说明`,
    variables: ['question', 'context'],
  },

  /**
   * 模板：RAG 问答
   * 💡 这是 RAG 模块中使用的核心 Prompt
   */
  rag_qa: {
    name: 'RAG 问答',
    version: '1.1',
    template: `你是一个知识库助手。请严格根据以下参考资料回答用户问题。
      
      如果参考资料中没有相关内容，请回答"根据现有知识库，我无法回答这个问题"，不要编造答案。

      参考资料：
      {{references}}

      用户问题：{{question}}

      回答格式：
      - 先直接回答问题
      - 如果引用了参考资料，标注来源 [1]、[2] 等
      - 如有补充说明，放在最后`,
    variables: ['question', 'references'],
  },

  /**
   * 模板：Agent 系统提示
   * 💡 这是 Agent 主逻辑的 System Prompt
   */
  agent_system: {
    name: 'Agent 系统提示',
    version: '1.0',
    template: `你是一个智能助手，名叫{{agent_name}}。
      你的核心能力：
      {{capabilities}}
      使用规则：
      1. 优先使用知识库中的信息回答问题
      2. 需要时可以调用工具获取信息
      3. 不确定的内容请明确说明
      4. 用中文回答
      回答风格：{{tone}}`,
    variables: ['agent_name', 'capabilities', 'tone'],
  },

  /**
   * 模板：代码审查
   */
  code_review: {
    name: '代码审查',
    version: '1.0',
    template: `请审查以下{{language}}代码：

\`\`\`{{language}}
{{code}}
\`\`\`

审查维度：
1. 🐛 正确性：是否有 Bug？
2. 📖 可读性：命名是否清晰？注释是否充分？
3. 🚀 性能：是否有性能问题？
4. 🔒 安全性：是否有安全漏洞？
5. 🏗️ 架构：设计模式是否合理？

请按以上维度逐一分析，最后给出改进建议。`,
    variables: ['language', 'code'],
  },

  /**
   * 模板：评测打分
   * 💡 用于 Evaluation 模块的 LLM-as-Judge
   */
  evaluation_judge: {
    name: '评测打分',
    version: '1.0',
    template: `你是一个严格的质量评审专家。请评估以下 AI 回答的质量。

问题：{{question}}

AI 回答：{{answer}}

参考答案：{{reference}}

评分维度（每项 1-5 分）：
1. 准确性：回答是否正确
2. 完整性：是否覆盖了问题的关键点
3. 清晰度：表达是否清晰易懂
4. 相关性：是否紧扣问题

请以 JSON 格式输出评分：
{"accuracy": N, "completeness": N, "clarity": N, "relevance": N, "comment": "评语"}`,
    variables: ['question', 'answer', 'reference'],
  },
};

/**
 * 渲染 Prompt 模板
 *
 * 💡 这是模板引擎的核心：
 * 1. 替换 {{variable}} 为实际值
 * 2. 处理条件块 {{#if variable}}...{{/if}}
 *
 * @param {string} templateStr - 模板字符串
 * @param {object} vars - 变量键值对
 * @returns {string} 渲染后的字符串
 */
export function renderTemplate(templateStr, vars = {}) {
  let result = templateStr;

  // 处理条件块 {{#if variable}}...{{/if}}
  //
  // 💡 正则解析（逐段拆解）：
  //   /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g
  //    ─────────────────  ──────────  ────────────
  //    匹配开始标签        匹配中间内容  匹配结束标签
  //
  //   \{\{#if\s+(\w+)\}\}  —— 匹配 {{#if xxx}}
  //     \{\{              匹配字面量 {{
  //     #if\s+            匹配 #if 加至少一个空白
  //     (\w+)             捕获组1：变量名（如 "context"）
  //     \}\}              匹配字面量 }}
  //
  //   ([\s\S]*?)           —— 匹配标签之间的内容（非贪婪）
  //     [\s\S]            匹配任何字符（包括换行符）
  //     *?                非贪婪：尽量少匹配，到第一个 }}{{/if}} 就停
  //     ()                捕获组2：条件块内的内容
  //
  //   \{\{\/if\}\}          —— 匹配 {{/if}} 结束标签
  //
  //   g                    —— 全局匹配，替换所有条件块
  //
  // 💡 回调函数的参数：
  //   match   — 整个匹配的字符串（如 "{{#if context}}参考资料：...{{/if}}"）
  //   varName — 捕获组1：变量名（如 "context"）
  //   content — 捕获组2：条件块内的内容（如 "参考资料：..."）
  //
  // 💡 示例：
  //   模板："Hi{{#if name}}, {{name}}{{/if}}"
  //   vars = { name: "张三" } → "Hi, 张三"    （name 有值，保留内容）
  //   vars = {}              → "Hi"            （name 无值，移除整个条件块）
  //
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
    return vars[varName] ? content : ''; // 变量有值→保留内容，无值→移除整个条件块
  });

  // 替换变量 {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (varName in vars) {
      return String(vars[varName]);
    }
    return match; // 未提供的变量保持原样
  });

  return result;
}

/**
 * 便捷方法：使用模板名渲染
 */
export function render(templateName, vars = {}) {
  const tmpl = templates[templateName];
  if (!tmpl) throw new Error(`未知模板: ${templateName}，可用: ${Object.keys(templates).join(', ')}`);
  return renderTemplate(tmpl.template, vars);
}

/**
 * 列出所有模板
 */
export function listTemplates() {
  return Object.entries(templates).map(([key, tmpl]) => ({
    key,
    name: tmpl.name,
    version: tmpl.version,
    variables: tmpl.variables,
  }));
}

/**
 * 💡 进阶：自定义模板注册
 * 在实际项目中，你可能需要从数据库或文件加载自定义模板
 */
export function registerTemplate(key, tmpl) {
  templates[key] = tmpl;
}
