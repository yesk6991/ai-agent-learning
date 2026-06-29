import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function main() {
  console.log('流式输出:\n');

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: '写一首关于编程的短诗' },
    ],
  });

  stream.on('text', (text) => {
    process.stdout.write(text);
  });

  const finalMessage = await stream.finalMessage();
  console.log('\n\n--- 统计 ---');
  console.log('输入 tokens:', finalMessage.usage.input_tokens);
  console.log('输出 tokens:', finalMessage.usage.output_tokens);
}

main().catch(console.error);
