// 💡 学习要点：技能定义是 Agent 工具调用的基础
// 每个技能需要提供两部分：
// 1. Anthropic Tool Schema（告诉模型这个工具能做什么、参数是什么）
// 2. 执行函数（实际执行工具逻辑）

/**
 * 天气查询技能
 *
 * 💡 在真实项目中，这里会调用天气 API
 * 我们用模拟数据来演示工具调用的完整流程
 */
export const weatherTool = {
  // Anthropic Tool Schema —— 模型通过这个定义了解工具
  schema: {
    name: 'get_weather',
    description: '获取指定城市的天气信息，包括温度、天气状况、空气质量',
    input_schema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称，如"北京"、"上海"',
        },
      },
      required: ['city'],
    },
  },

  // 执行函数
  async execute({ city }) {
    // 💡 模拟数据：真实项目中替换为 API 调用
    const weatherData = {
      '北京': { temp: '28°C', condition: '晴天', aqi: '优' },
      '上海': { temp: '25°C', condition: '多云', aqi: '良' },
      '深圳': { temp: '30°C', condition: '雷阵雨', aqi: '良' },
      '广州': { temp: '31°C', condition: '多云', aqi: '良' },
      '成都': { temp: '22°C', condition: '小雨', aqi: '优' },
      '杭州': { temp: '26°C', condition: '晴转多云', aqi: '良' },
    };

    const data = weatherData[city];
    if (!data) {
      return `${city}: 暂无天气数据。支持查询：北京、上海、深圳、广州、成都、杭州`;
    }

    return `${city} - ${data.condition}，温度 ${data.temp}，空气质量 ${data.aqi}`;
  },
};
