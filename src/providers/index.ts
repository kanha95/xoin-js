import { ProviderConfigurationError } from '../core/errors';
import { ProviderAdapter } from '../types';
import { AnthropicProvider } from './anthropic';
import { OpenAICompatibleProvider } from './openai-compatible';

export interface OpenAICompatibleProviderOptions {
  name: string;
  apiKey: string;
  baseUrl: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  structuredOutputs?: 'json-schema' | 'json-object' | 'prompt-only';
  embeddings?: boolean;
}

export function createOpenAIProvider(config: {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  fetch?: typeof fetch;
}): ProviderAdapter {
  return new OpenAICompatibleProvider({
    name: 'openai',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl ?? 'https://api.openai.com/v1',
    defaultModel: config.defaultModel ?? 'gpt-4.1-mini',
    defaultEmbeddingModel: config.defaultEmbeddingModel ?? 'text-embedding-3-small',
    capabilities: { structuredOutputs: 'json-schema', embeddings: true },
    fetch: config.fetch,
  });
}

export function createDeepSeekProvider(config: {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  fetch?: typeof fetch;
}): ProviderAdapter {
  return new OpenAICompatibleProvider({
    name: 'deepseek',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl ?? 'https://api.deepseek.com',
    defaultModel: config.defaultModel ?? 'deepseek-v4-flash',
    capabilities: { structuredOutputs: 'json-object', embeddings: false },
    fetch: config.fetch,
  });
}

export function createGeminiProvider(config: {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  fetch?: typeof fetch;
}): ProviderAdapter {
  return new OpenAICompatibleProvider({
    name: 'gemini',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: config.defaultModel ?? 'gemini-2.5-flash',
    defaultEmbeddingModel: config.defaultEmbeddingModel ?? 'text-embedding-004',
    capabilities: { structuredOutputs: 'json-schema', embeddings: true },
    fetch: config.fetch,
  });
}

export function createMistralProvider(config: {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  fetch?: typeof fetch;
}): ProviderAdapter {
  return new OpenAICompatibleProvider({
    name: 'mistral',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl ?? 'https://api.mistral.ai/v1',
    defaultModel: config.defaultModel ?? 'mistral-small-latest',
    defaultEmbeddingModel: config.defaultEmbeddingModel ?? 'mistral-embed',
    capabilities: { structuredOutputs: 'json-object', embeddings: true },
    fetch: config.fetch,
  });
}

export function createAnthropicProvider(config: {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}): ProviderAdapter {
  return new AnthropicProvider({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    defaultModel: config.defaultModel ?? 'claude-sonnet-4-20250514',
    fetch: config.fetch,
    headers: config.headers,
  });
}

export function createOpenAICompatibleProvider(config: OpenAICompatibleProviderOptions): ProviderAdapter {
  return new OpenAICompatibleProvider({
    name: config.name,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    defaultModel: config.defaultModel,
    defaultEmbeddingModel: config.defaultEmbeddingModel,
    capabilities: {
      structuredOutputs: config.structuredOutputs ?? 'json-object',
      embeddings: config.embeddings ?? true,
    },
    fetch: config.fetch,
    headers: config.headers,
  });
}

export function ensureProvider(name: string, provider: ProviderAdapter | undefined): ProviderAdapter {
  if (!provider) {
    throw new ProviderConfigurationError(`Provider "${name}" is not registered.`);
  }

  return provider;
}
