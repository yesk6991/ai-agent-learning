// 评测模块统一入口
export { evaluateAnswer, stringSimilarity, keywordHitRate, jsonFormatCheck, lengthCheck } from './metrics.js';
export { evalCases, getCasesByCategory, getCasesByDifficulty, getCategories } from './cases.js';
export { EvalRunner } from './runner.js';
