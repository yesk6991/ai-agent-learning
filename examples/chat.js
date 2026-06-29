import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function main() {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: '用一句话介绍什么是大语言模型' },
    ],
  });

  console.log('角色:', message.role);
  console.log('内容:', message.content[0].text);
  console.log('输入 tokens:', message.usage.input_tokens);
  console.log('输出 tokens:', message.usage.output_tokens);
}

main().catch(console.error);
