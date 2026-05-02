import dotenv from 'dotenv';

import { createOpenAIProvider, createXoin } from '../../dist/index.mjs';

dotenv.config({ path: new URL('./.env', import.meta.url).pathname });
dotenv.config();

async function main() {
  // Create a Xoin client with an embedding-capable OpenAI provider.
  const xoin = createXoin({
    providers: {
      openai: createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY || '',
        defaultEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      }),
    },
  });

  // Generate embeddings for multiple input strings.
  const result = await xoin.embed({
    provider: 'openai',
    input: ['semantic search', 'vector database'],
  });

  console.log(
    JSON.stringify(
      {
        provider: result.provider,
        model: result.model,
        embeddingCount: result.embeddings.length,
        dimensions: result.embeddings[0]?.length || 0,
        preview: result.embeddings.map((vector) => vector.slice(0, 5)),
        usage: result.usage,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
