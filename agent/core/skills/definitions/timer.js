// 💡 学习要点：时间工具是最常用的基础技能之一
// - Agent 需要感知时间来做出合理的决策
// - 比如判断"今天适不适合户外运动"需要知道当前季节和天气

/**
 * 时间查询技能
 */
export const timerTool = {
  schema: {
    name: 'get_time',
    description: '获取当前日期和时间信息',
    input_schema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: '时间格式：date(仅日期)、time(仅时间)、full(完整)',
          enum: ['date', 'time', 'full'],
        },
      },
      required: [],
    },
  },

  async execute({ format = 'full' } = {}) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    const timeStr = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    switch (format) {
      case 'date':
        return dateStr;
      case 'time':
        return timeStr;
      default:
        return `${dateStr} ${timeStr}`;
    }
  },
};
