import { z } from 'zod';
import dotenv from 'dotenv';

import {
  createAnthropicProvider,
  createOpenAIProvider,
  createXoin,
} from '../../dist/index.mjs';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
dotenv.config();

async function main() {
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  const prompt = 'Extract a JSON object from: "Ava is 31 years old."';

  // Configure a primary provider and a fallback provider.
  const xoin = createXoin({
    defaultProvider: 'openai',
    fallbackProviders: ['anthropic'],
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

  // Xoin will try OpenAI first and then Anthropic if needed.
  const result = await xoin.generate({
    provider: 'openai',
    providerOrder: ['anthropic'],
    prompt,
    structured: {
      name: 'user_profile',
      schema: userSchema,
    },
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
