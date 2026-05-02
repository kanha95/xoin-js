import { z } from 'zod';
import dotenv from 'dotenv';

import { createAnthropicProvider, createXoin } from '../../dist/index.mjs';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
dotenv.config();

async function main() {
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  const prompt = 'Extract a JSON object from: "Ria is 25 years old."';

  // Create a Xoin client with the Anthropic provider.
  const xoin = createXoin({
    providers: {
      anthropic: createAnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      }),
    },
  });

  // Ask for structured output and let zod validate the result.
  const result = await xoin.generate({
    provider: 'anthropic',
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
