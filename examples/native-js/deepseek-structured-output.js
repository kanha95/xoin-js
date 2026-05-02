import { z } from 'zod';
import dotenv from 'dotenv';

import { createDeepSeekProvider, createXoin } from '../../dist/index.mjs';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
dotenv.config();

async function main() {
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  const prompt = 'Extract a JSON object from: "Kabir is 33 years old."';

  // Create a Xoin client with the DeepSeek provider.
  const xoin = createXoin({
    providers: {
      deepseek: createDeepSeekProvider({
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      }),
    },
  });

  // Ask for structured output and let zod validate the result.
  const result = await xoin.generate({
    provider: 'deepseek',
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
