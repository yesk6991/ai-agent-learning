// 💡 学习要点：评测(Evaluation)是 AI 工程化最容易被忽视、但最关键的环节
// - 没有评测，你不知道 Prompt 改了是变好还是变差
// - 没有评测，你不知道换个模型效果如何
// - 评测让 AI 开发从"凭感觉"变成"靠数据"
//
// 三类核心评测方法：
// 1. 字符串相似度 —— 简单快速，适合格式化输出
// 2. 关键词命中率 —— 检查关键信息是否出现
// 3. LLM-as-Judge —— 用 LLM 评判 LLM，最接近人类判断

/**
 * Levenshtein 距离（编辑距离）
 *
 * 💡 计算把字符串 A 变成字符串 B 需要的最少编辑操作数
 * 编辑操作：插入、删除、替换一个字符
 * 距离越小，两个字符串越相似
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // 字符相同，无需编辑
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // 删除
          dp[i][j - 1],     // 插入
          dp[i - 1][j - 1], // 替换
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * 字符串相似度（基于编辑距离）
 *
 * 💡 值域 [0, 1]，1 表示完全相同
 * 适合评测：翻译、总结等输出与参考答案较接近的任务
 */
export function stringSimilarity(actual, expected) {
  if (!actual || !expected) return 0;
  const maxLen = Math.max(actual.length, expected.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(actual, expected);
  return 1 - distance / maxLen;
}

/**
 * 关键词命中率
 *
 * 💡 检查预期关键词是否出现在输出中
 * 适合评测：事实性问答、知识检索等任务
 * 例如：问"RAG 的全称是什么"，关键词 ["Retrieval", "Augmented", "Generation"]
 */
export function keywordHitRate(actual, keywords) {
  if (!keywords || keywords.length === 0) return 1;
  if (!actual) return 0;

  const lowerActual = actual.toLowerCase();
  const hits = keywords.filter(kw => lowerActual.includes(kw.toLowerCase()));
  return hits.length / keywords.length;
}

/**
 * JSON 格式检查
 *
 * 💡 检查输出是否为合法 JSON，以及是否包含必需字段
 * 适合评测：结构化输出任务
 */
export function jsonFormatCheck(actual, requiredFields = []) {
  let parsed = null;
  let isValid = false;

  try {
    parsed = JSON.parse(actual);
    isValid = true;
  } catch {
    return { isValid: false, hasAllFields: false, missingFields: requiredFields };
  }

  const missingFields = requiredFields.filter(f => !(f in parsed));
  return {
    isValid,
    hasAllFields: missingFields.length === 0,
    missingFields,
  };
}

/**
 * 长度合规检查
 *
 * 💡 检查输出长度是否在预期范围内
 * 太短可能回答不完整，太长可能包含冗余信息
 */
export function lengthCheck(actual, { min = 0, max = Infinity } = {}) {
  const len = actual?.length || 0;
  return {
    length: len,
    inRange: len >= min && len <= max,
  };
}

/**
 * 综合评测：对一条回答跑所有指标
 *
 * 💡 实际项目中，通常需要组合多个指标来全面评估
 * 每个指标的权重可以根据任务调整
 */
export function evaluateAnswer({ actual, expected, keywords = [], requiredFields = [], lengthRange = {} }) {
  const results = {};

  // 字符串相似度（需要参考答案）
  if (expected) {
    results.similarity = {
      score: stringSimilarity(actual, expected),
      description: '输出与参考答案的字符串相似度',
    };
  }

  // 关键词命中率
  if (keywords.length > 0) {
    results.keywordHit = {
      score: keywordHitRate(actual, keywords),
      description: `关键词命中率 (${keywords.join(', ')})`,
    };
  }

  // JSON 格式检查
  if (requiredFields.length > 0) {
    const jsonCheck = jsonFormatCheck(actual, requiredFields);
    results.jsonFormat = {
      score: jsonCheck.isValid && jsonCheck.hasAllFields ? 1 : 0,
      description: `JSON 格式与必需字段检查`,
      details: jsonCheck,
    };
  }

  // 长度检查
  if (lengthRange.min || lengthRange.max) {
    const lenCheck = lengthCheck(actual, lengthRange);
    results.length = {
      score: lenCheck.inRange ? 1 : 0,
      description: '输出长度合规性',
      details: lenCheck,
    };
  }

  // 综合得分（各指标平均）
  const scores = Object.values(results).map(r => r.score);
  results.overall = {
    score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    description: '综合得分（各指标平均值）',
  };

  return results;
}
