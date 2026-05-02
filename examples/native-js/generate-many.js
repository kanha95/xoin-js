import dotenv from 'dotenv';

import {
  createAnthropicProvider,
  createOpenAIProvider,
  createXoin,
} from '../../dist/index.mjs';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
dotenv.config();

async function main() {
  const prompt = 'Summarize why structured outputs are useful in exactly 2 short bullets.';

  // Configure one Xoin client with multiple real providers.
  const xoin = createXoin({
    providers: {
      openai: createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY || '',
        defaultModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      }),
      anthropic: createAnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      }),
    },
  });

  // Send the same prompt to multiple providers in parallel.
  const results = await xoin.generateMany({
    targets: [
      { provider: 'openai' },
      { provider: 'anthropic' },
    ],
    prompt,
  });

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
