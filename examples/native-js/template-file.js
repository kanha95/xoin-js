import { z } from 'zod';
import dotenv from 'dotenv';

import { createOpenAIProvider, createXoin } from '../../dist/index.mjs';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
dotenv.config();

async function main() {
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  // Configure Xoin with OpenAI for a real template-file example.
  const xoin = createXoin({
    providers: {
      openai: createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY || '',
        defaultModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      }),
    },
  });

  // Load the prompt from a YAML template file.
  const result = await xoin.generate({
    provider: 'openai',
    templateFile: './examples/native-js/templates/extract-user.yaml',
    input: {
      user_query: 'Nina is 28 years old and lives in Pune.',
    },
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
