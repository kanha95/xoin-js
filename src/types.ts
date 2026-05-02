import { z } from 'zod';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface JsonSchema {
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema | JsonSchema[];
  required?: string[];
  enum?: JsonValue[];
  additionalProperties?: boolean | JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  nullable?: boolean;
  minItems?: number;
  maxItems?: number;
  [key: string]: JsonValue | JsonSchema | JsonSchema[] | Record<string, JsonSchema> | undefined;
}

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
}

export interface UsageStats {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ProviderCapabilities {
  structuredOutputs?: 'json-schema' | 'json-object' | 'prompt-only';
  embeddings?: boolean;
}

export interface TemplateDefinition {
  template: string;
  defaults?: Record<string, unknown>;
  description?: string;
  metadata?: Record<string, JsonValue>;
}

export interface StructuredOutputOptions<T> {
  schema: z.ZodType<T>;
  jsonSchema?: JsonSchema;
  mode?: 'auto' | 'native' | 'prompted';
  name?: string;
  description?: string;
}

export interface GenerationTarget {
  provider: string;
  model?: string;
}

export interface PriorityGenerationTarget extends GenerationTarget {
  priority: number;
}

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

export interface GenerationRequest<T> {
  provider?: string;
  providerOrder?: string[];
  providerTargets?: PriorityGenerationTarget[];
  model?: string;
  prompt?: string;
  system?: string;
  messages?: ChatMessage[];
  template?: string;
  templateId?: string;
  templateFile?: string;
  input?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
  structured?: StructuredOutputOptions<T>;
  providerOptions?: Record<string, unknown>;
  retry?: number | RetryOptions;
  signal?: AbortSignal;
}

export interface GenerateManyRequest<T> extends Omit<GenerationRequest<T>, 'provider' | 'providerOrder' | 'model'> {
  targets: GenerationTarget[];
}

export interface GenerateResult<T> {
  provider: string;
  model: string;
  text: string;
  data?: T;
  usage?: UsageStats;
  finishReason?: string;
  raw: unknown;
}

export interface EmbeddingRequest {
  provider?: string;
  model?: string;
  input: string | string[];
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface EmbeddingResult {
  provider: string;
  model: string;
  embeddings: number[][];
  usage?: UsageStats;
  raw: unknown;
}

export interface ProviderGenerateOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
  responseFormat?: ProviderResponseFormat;
  providerOptions?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface ProviderEmbeddingOptions {
  model: string;
  input: string[];
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
  signal?: AbortSignal;
}

export type ProviderResponseFormat =
  | { type: 'text' }
  | { type: 'json_object' }
  | { type: 'json_schema'; name: string; description?: string; schema: JsonSchema; strict?: boolean };

export interface ProviderGenerateResult {
  model: string;
  text: string;
  structuredData?: unknown;
  usage?: UsageStats;
  finishReason?: string;
  raw: unknown;
}

export interface ProviderEmbeddingResult {
  model: string;
  embeddings: number[][];
  usage?: UsageStats;
  raw: unknown;
}

export interface ProviderAdapter {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  readonly defaultModel?: string;
  readonly defaultEmbeddingModel?: string;
  generate(options: ProviderGenerateOptions): Promise<ProviderGenerateResult>;
  embed?(options: ProviderEmbeddingOptions): Promise<ProviderEmbeddingResult>;
}

export interface ProviderFactoryContext {
  fetch: typeof fetch;
}

export type ProviderEntry =
  | ProviderAdapter
  | ((context: ProviderFactoryContext) => ProviderAdapter);

export interface XoinConfig {
  providers: Record<string, ProviderEntry>;
  defaultProvider?: string;
  fallbackProviders?: string[];
  templates?: Record<string, TemplateDefinition>;
  retry?: number | RetryOptions;
  fetch?: typeof fetch;
}
