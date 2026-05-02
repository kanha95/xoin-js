import { z } from 'zod';
import dotenv from 'dotenv';

import { createMistralProvider, createXoin } from '../../dist/index.mjs';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
dotenv.config();

async function main() {
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  const prompt = 'Extract a JSON object from: "Nina is 28 years old."';

  // Create a Xoin client with the Mistral provider.
  const xoin = createXoin({
    providers: {
      mistral: createMistralProvider({
        apiKey: process.env.MISTRAL_API_KEY || '',
        defaultModel: process.env.MISTRAL_MODEL || 'mistral-small-latest',
      }),
    },
  });

  // Ask for structured output and let zod validate the result.
  const result = await xoin.generate({
    provider: 'mistral',
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
