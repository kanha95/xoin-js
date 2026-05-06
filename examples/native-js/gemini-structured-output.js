import { z } from 'zod';
import dotenv from 'dotenv';

import { createGeminiProvider, createXoin } from '../../dist/index.mjs';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
dotenv.config();

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});

async function main() {
  const xoin = createXoin({
    providers: {
      gemini: createGeminiProvider({
        apiKey: process.env.GEMINI_API_KEY || '',
        defaultModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      }),
    },
  });

  const result = await xoin.generate({
    provider: 'gemini',
    prompt: 'Extract JSON from: "Ava is 31 years old."',
    structured: {
      name: 'user_profile',
      schema: userSchema,
    },
  });

  console.log('Gemini structured result:');
  console.log(JSON.stringify(result.data, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
