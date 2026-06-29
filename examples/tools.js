import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// 定义一个简单的工具：获取天气
const tools = [
  {
    name: 'get_weather',
    description: '获取指定城市的天气信息',
    input_schema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称',
        },
      },
      required: ['city'],
    },
  },
];

// 模拟工具执行
function getWeather(city) {
  const data = {
    '北京': '晴天 28°C',
    '上海': '多云 25°C',
    '深圳': '雷阵雨 30°C',
  };
  return data[city] || `${city}: 暂无数据`;
}

async function main() {
  // 第一步：发送带工具的请求
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 1024,
    tools,
    messages: [
      { role: 'user', content: '北京和上海今天天气怎么样？' },
    ],
  });

  console.log('模型返回的 tool_use blocks:');
  const toolResults = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      console.log('文本:', block.text);
    } else if (block.type === 'tool_use') {
      console.log(`  工具: ${block.name}, 参数:`, block.input);
      const result = getWeather(block.input.city);
      console.log(`  执行结果: ${result}`);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      });
    }
  }

  // 第二步：把工具结果返回给模型，让它生成最终回复
  const finalResponse = await client.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 1024,
    tools,
    messages: [
      { role: 'user', content: '北京和上海今天天气怎么样？' },
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ],
  });

  console.log('\n最终回复:');
  for (const block of finalResponse.content) {
    if (block.type === 'text') {
      console.log(block.text);
    }
  }
}

main().catch(console.error);
