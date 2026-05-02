import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAnthropicProvider,
  createOpenAICompatibleProvider,
  createOpenAIProvider,
  createXoin,
  ProviderExecutionError,
} from '../dist/index.mjs';
import { z } from 'zod';

const extractUserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

test('falls back to the next provider when the first provider fails', async () => {
  const xoin = createXoin({
    defaultProvider: 'broken',
    fallbackProviders: ['working'],
    providers: {
      broken: {
        name: 'broken',
        capabilities: { structuredOutputs: 'prompt-only' },
        defaultModel: 'broken-chat',
        async generate() {
          throw new ProviderExecutionError('boom', 'broken', 'broken-chat');
        },
      },
      working: {
        name: 'working',
        capabilities: { structuredOutputs: 'prompt-only' },
        defaultModel: 'working-chat',
        async generate() {
          return {
            model: 'working-chat',
            text: '{"name":"Ava","age":31}',
            raw: { ok: true },
          };
        },
      },
    },
  });

  const result = await xoin.generate({
    prompt: 'Extract the user.',
    structured: {
      schema: extractUserSchema,
    },
  });

  assert.equal(result.provider, 'working');
  assert.deepEqual(result.data, { name: 'Ava', age: 31 });
});

test('loads YAML template files and renders variables', async () => {
  const calls = [];
  const xoin = createXoin({
    providers: {
      mock: {
        name: 'mock',
        capabilities: { structuredOutputs: 'prompt-only' },
        defaultModel: 'mock-chat',
        async generate(options) {
          calls.push(options.messages);
          return {
            model: 'mock-chat',
            text: '{"name":"Nina","age":28}',
            raw: {},
          };
        },
      },
    },
  });

  await xoin.generate({
    provider: 'mock',
    templateFile: new URL('../templates/extract-user.yaml', import.meta.url).pathname,
    input: {
      user_query: 'Nina is 28 years old.',
    },
    structured: {
      schema: extractUserSchema,
    },
  });

  assert.match(calls[0][calls[0].length - 1].content, /Nina is 28 years old\./);
});

test('uses native json schema for OpenAI-compatible providers when available', async () => {
  const bodies = [];
  const provider = createOpenAIProvider({
    apiKey: 'test-key',
    fetch: async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return new Response(
        JSON.stringify({
          model: 'gpt-4.1-mini',
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: '{"name":"Maya","age":22}',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const xoin = createXoin({
    providers: {
      openai: provider,
    },
  });

  const result = await xoin.generate({
    provider: 'openai',
    prompt: 'Extract a person.',
    structured: {
      schema: extractUserSchema,
    },
  });

  assert.equal(bodies[0].response_format.type, 'json_schema');
  assert.deepEqual(bodies[0].response_format.json_schema.schema, {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
    required: ['name', 'age'],
    additionalProperties: false,
  });
  assert.deepEqual(result.data, { name: 'Maya', age: 22 });
});

test('parses Anthropic structured output via forced tool use', async () => {
  const bodies = [];
  const provider = createAnthropicProvider({
    apiKey: 'test-key',
    fetch: async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return new Response(
        JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          content: [
            {
              type: 'tool_use',
              name: 'structured_response',
              input: { name: 'Ria', age: 25 },
            },
          ],
          usage: { input_tokens: 10, output_tokens: 4 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const xoin = createXoin({
    providers: {
      anthropic: provider,
    },
  });

  const result = await xoin.generate({
    provider: 'anthropic',
    prompt: 'Extract a user profile.',
    structured: {
      schema: extractUserSchema,
    },
  });

  assert.equal(bodies[0].tool_choice.name, 'structured_response');
  assert.deepEqual(bodies[0].tools[0].input_schema, {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
    required: ['name', 'age'],
    additionalProperties: false,
  });
  assert.deepEqual(result.data, { name: 'Ria', age: 25 });
});

test('allows explicit jsonSchema override when needed', async () => {
  const bodies = [];
  const provider = createOpenAIProvider({
    apiKey: 'test-key',
    fetch: async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return new Response(
        JSON.stringify({
          model: 'gpt-4.1-mini',
          choices: [{ message: { content: '{"name":"Override","age":40}' } }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const xoin = createXoin({
    providers: {
      openai: provider,
    },
  });

  await xoin.generate({
    provider: 'openai',
    prompt: 'Extract a person.',
    structured: {
      schema: extractUserSchema,
      jsonSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          note: { type: 'string' },
        },
        required: ['name', 'age'],
        additionalProperties: false,
      },
    },
  });

  assert.ok('note' in bodies[0].response_format.json_schema.schema.properties);
});

test('supports embeddings on OpenAI-compatible providers', async () => {
  const provider = createOpenAICompatibleProvider({
    name: 'custom-openai',
    apiKey: 'embed-key',
    baseUrl: 'https://example.com/v1',
    defaultEmbeddingModel: 'custom-embed',
    fetch: async (url) => {
      assert.equal(url, 'https://example.com/v1/embeddings');
      return new Response(
        JSON.stringify({
          model: 'custom-embed',
          data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const xoin = createXoin({
    providers: {
      custom: provider,
    },
  });

  const result = await xoin.embed({
    provider: 'custom',
    input: ['a', 'b'],
  });

  assert.deepEqual(result.embeddings, [
    [0.1, 0.2],
    [0.3, 0.4],
  ]);
});

test('retries the same provider before succeeding', async () => {
  let attempts = 0;
  const xoin = createXoin({
    providers: {
      flaky: {
        name: 'flaky',
        capabilities: { structuredOutputs: 'prompt-only' },
        defaultModel: 'flaky-chat',
        async generate() {
          attempts += 1;
          if (attempts < 3) {
            throw new ProviderExecutionError('temporary failure', 'flaky', 'flaky-chat');
          }

          return {
            model: 'flaky-chat',
            text: '{"name":"Retry","age":27}',
            raw: {},
          };
        },
      },
    },
  });

  const result = await xoin.generate({
    provider: 'flaky',
    retry: 2,
    prompt: 'Extract the user.',
    structured: {
      schema: extractUserSchema,
    },
  });

  assert.equal(attempts, 3);
  assert.deepEqual(result.data, { name: 'Retry', age: 27 });
});

test('uses priority-based provider targets in ascending order', async () => {
  const calls = [];
  const xoin = createXoin({
    providers: {
      openai: {
        name: 'openai',
        capabilities: { structuredOutputs: 'prompt-only' },
        defaultModel: 'gpt-4.1-mini',
        async generate() {
          calls.push('openai');
          throw new ProviderExecutionError('skip', 'openai', 'gpt-4.1-mini');
        },
      },
      anthropic: {
        name: 'anthropic',
        capabilities: { structuredOutputs: 'prompt-only' },
        defaultModel: 'claude-sonnet',
        async generate() {
          calls.push('anthropic');
          return {
            model: 'claude-sonnet',
            text: '{"name":"Priority","age":30}',
            raw: {},
          };
        },
      },
      groq: {
        name: 'groq',
        capabilities: { structuredOutputs: 'prompt-only' },
        defaultModel: 'llama-3.1-70b',
        async generate() {
          calls.push('groq');
          return {
            model: 'llama-3.1-70b',
            text: '{"name":"Late","age":40}',
            raw: {},
          };
        },
      },
    },
  });

  const result = await xoin.generate({
    providerTargets: [
      { priority: 3, provider: 'groq', model: 'llama-3.1-70b' },
      { priority: 1, provider: 'openai', model: 'gpt-4.1-mini' },
      { priority: 2, provider: 'anthropic', model: 'claude-sonnet' },
    ],
    prompt: 'Extract the user.',
    structured: {
      schema: extractUserSchema,
    },
  });

  assert.deepEqual(calls, ['openai', 'anthropic']);
  assert.equal(result.provider, 'anthropic');
  assert.equal(result.model, 'claude-sonnet');
  assert.deepEqual(result.data, { name: 'Priority', age: 30 });
});

test('falls back when a provider returns schema-invalid output', async () => {
  const xoin = createXoin({
    providers: {
      invalid: {
        name: 'invalid',
        capabilities: { structuredOutputs: 'prompt-only' },
        defaultModel: 'invalid-chat',
        async generate() {
          return {
            model: 'invalid-chat',
            text: '{"name":"Bad","age":"not-a-number"}',
            raw: {},
          };
        },
      },
      valid: {
        name: 'valid',
        capabilities: { structuredOutputs: 'prompt-only' },
        defaultModel: 'valid-chat',
        async generate() {
          return {
            model: 'valid-chat',
            text: '{"name":"Good","age":32}',
            raw: {},
          };
        },
      },
    },
  });

  const result = await xoin.generate({
    providerTargets: [
      { priority: 1, provider: 'invalid' },
      { priority: 2, provider: 'valid' },
    ],
    prompt: 'Extract the user.',
    structured: {
      schema: extractUserSchema,
    },
  });

  assert.equal(result.provider, 'valid');
  assert.deepEqual(result.data, { name: 'Good', age: 32 });
});
