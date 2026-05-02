import { z } from 'zod';
import dotenv from 'dotenv';

import { createOpenAICompatibleProvider, createXoin } from '../../dist/index.mjs';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
dotenv.config();

async function main() {
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  const prompt = 'Extract a JSON object from: "Aarav is 35 years old."';

  // Configure a real OpenAI-compatible provider using Groq.
  const xoin = createXoin({
    providers: {
      groq: createOpenAICompatibleProvider({
        name: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
        baseUrl: process.env.GROQ_BASE_URL || '',
        defaultModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        structuredOutputs: 'json-object',
        embeddings: false,
      }),
    },
  });

  // Force native structured output mode for the compatible backend.
  const result = await xoin.generate({
    provider: 'groq',
    prompt,
    structured: {
      name: 'user_profile',
      schema: userSchema,
      mode: 'native',
    },
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
