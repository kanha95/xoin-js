import { fetchJson } from '../core/http';
import { ProviderExecutionError } from '../core/errors';
import {
  ChatMessage,
  ProviderCapabilities,
  ProviderEmbeddingOptions,
  ProviderEmbeddingResult,
  ProviderGenerateOptions,
  ProviderGenerateResult,
  ProviderResponseFormat,
  UsageStats,
} from '../types';
import { BaseProvider } from './base';

interface OpenAICompatibleConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  capabilities?: ProviderCapabilities;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

interface OpenAIChatResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
}

interface OpenAIEmbeddingResponse {
  data?: Array<{ embedding: number[] }>;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
}

export class OpenAICompatibleProvider extends BaseProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  readonly defaultModel?: string;
  readonly defaultEmbeddingModel?: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetcher: typeof fetch;

  constructor(config: OpenAICompatibleConfig) {
    super();
    this.name = config.name;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.defaultModel = config.defaultModel;
    this.defaultEmbeddingModel = config.defaultEmbeddingModel;
    this.capabilities = config.capabilities ?? { structuredOutputs: 'json-object', embeddings: true };
    this.headers = config.headers ?? {};
    this.fetcher = config.fetch ?? fetch;
  }

  async generate(options: ProviderGenerateOptions): Promise<ProviderGenerateResult> {
    const response = await fetchJson<OpenAIChatResponse>(
      this.name,
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: options.model,
          messages: options.messages.map(toOpenAIMessage),
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          response_format: toOpenAIResponseFormat(options.responseFormat),
          ...options.providerOptions,
        }),
        signal: options.signal,
      },
      this.fetcher,
    );

    const choice = response.choices?.[0];
    const text = normalizeContent(choice?.message?.content);

    if (!text) {
      throw new ProviderExecutionError(`${this.name} returned an empty response.`, this.name, options.model);
    }

    return {
      model: response.model ?? options.model,
      text,
      usage: toUsage(response.usage),
      finishReason: choice?.finish_reason,
      raw: response,
    };
  }

  async embed(options: ProviderEmbeddingOptions): Promise<ProviderEmbeddingResult> {
    const model = options.model || this.defaultEmbeddingModel;
    if (!model) {
      throw new ProviderExecutionError(`${this.name} does not have a default embedding model.`, this.name);
    }

    const response = await fetchJson<OpenAIEmbeddingResponse>(
      this.name,
      `${this.baseUrl}/embeddings`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model,
          input: options.input,
          ...options.providerOptions,
        }),
        signal: options.signal,
      },
      this.fetcher,
    );

    return {
      model: response.model ?? model,
      embeddings: (response.data ?? []).map((item) => item.embedding),
      usage: toUsage(response.usage),
      raw: response,
    };
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...this.headers,
    };
  }
}

function toOpenAIMessage(message: ChatMessage): Record<string, string> {
  return {
    role: message.role,
    content: message.content,
  };
}

function toOpenAIResponseFormat(format?: ProviderResponseFormat): Record<string, unknown> | undefined {
  if (!format || format.type === 'text') {
    return undefined;
  }

  if (format.type === 'json_object') {
    return { type: 'json_object' };
  }

  return {
    type: 'json_schema',
    json_schema: {
      name: format.name,
      description: format.description,
      schema: format.schema,
      strict: format.strict ?? true,
    },
  };
}

function normalizeContent(content: string | Array<{ type?: string; text?: string }> | undefined): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? '')
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

function toUsage(usage?: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}): UsageStats | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}
