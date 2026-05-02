import { fetchJson } from '../core/http';
import { ProviderExecutionError } from '../core/errors';
import {
  ChatMessage,
  ProviderCapabilities,
  ProviderGenerateOptions,
  ProviderGenerateResult,
  UsageStats,
} from '../types';
import { BaseProvider } from './base';

interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}

interface AnthropicResponse {
  content?: Array<
    | { type: 'text'; text?: string }
    | { type: 'tool_use'; name?: string; input?: unknown }
  >;
  model?: string;
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export class AnthropicProvider extends BaseProvider {
  readonly name = 'anthropic';
  readonly capabilities: ProviderCapabilities = { structuredOutputs: 'json-schema' };
  readonly defaultModel?: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly headers: Record<string, string>;

  constructor(config: AnthropicConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/$/, '');
    this.defaultModel = config.defaultModel;
    this.fetcher = config.fetch ?? fetch;
    this.headers = config.headers ?? {};
  }

  async generate(options: ProviderGenerateOptions): Promise<ProviderGenerateResult> {
    const systemMessages = options.messages.filter((message) => message.role === 'system');
    const conversation = options.messages.filter((message) => message.role !== 'system');

    const response = await fetchJson<AnthropicResponse>(
      this.name,
      `${this.baseUrl}/messages`,
      {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: options.maxTokens ?? 1024,
          temperature: options.temperature,
          system: systemMessages.map((message) => message.content).join('\n\n') || undefined,
          messages: conversation.map(toAnthropicMessage),
          ...toAnthropicStructuredPayload(options),
          ...options.providerOptions,
        }),
        signal: options.signal,
      },
      this.fetcher,
    );

    const toolUse = response.content?.find((item) => item.type === 'tool_use');
    const textBlocks = response.content?.filter((item) => item.type === 'text') as Array<{ text?: string }> | undefined;
    const text = toolUse ? JSON.stringify(toolUse.input) : (textBlocks ?? []).map((item) => item.text ?? '').join('\n').trim();

    if (!text) {
      throw new ProviderExecutionError('anthropic returned an empty response.', this.name, options.model);
    }

    return {
      model: response.model ?? options.model,
      text,
      structuredData: toolUse?.input,
      usage: toUsage(response.usage),
      finishReason: response.stop_reason,
      raw: response,
    };
  }
}

function toAnthropicMessage(message: ChatMessage): Record<string, string> {
  return {
    role: message.role === 'tool' ? 'assistant' : message.role,
    content: message.content,
  };
}

function toAnthropicStructuredPayload(options: ProviderGenerateOptions): Record<string, unknown> {
  if (!options.responseFormat || options.responseFormat.type !== 'json_schema') {
    return {};
  }

  return {
    tools: [
      {
        name: options.responseFormat.name,
        description: options.responseFormat.description ?? 'Return structured JSON output.',
        input_schema: options.responseFormat.schema,
      },
    ],
    tool_choice: {
      type: 'tool',
      name: options.responseFormat.name,
    },
  };
}

function toUsage(usage?: { input_tokens?: number; output_tokens?: number }): UsageStats | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
  };
}
