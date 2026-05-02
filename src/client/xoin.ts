import { buildStructuredInstructions, parseStructuredData } from '../core/structured';
import { runWithFallback } from '../core/fallback';
import { getStructuredJsonSchema } from '../core/json-schema';
import {
  EmbeddingRequest,
  EmbeddingResult,
  GenerateManyRequest,
  GenerateResult,
  GenerationRequest,
  ProviderAdapter,
  ProviderEntry,
  ProviderGenerateOptions,
  RetryOptions,
  ProviderResponseFormat,
  XoinConfig,
} from '../types';
import { ProviderConfigurationError, ProviderExecutionError } from '../core/errors';
import { renderTemplate, resolveTemplate } from '../core/templates';
import { ensureProvider } from '../providers';

export class Xoin {
  private readonly providers: Map<string, ProviderAdapter>;
  private readonly defaultProvider?: string;
  private readonly fallbackProviders: string[];
  private readonly templates: XoinConfig['templates'];

  constructor(private readonly config: XoinConfig) {
    const fetcher = config.fetch ?? globalThis.fetch;
    if (!fetcher) {
      throw new ProviderConfigurationError('A global fetch implementation is required.');
    }

    this.providers = new Map<string, ProviderAdapter>();
    this.defaultProvider = config.defaultProvider;
    this.fallbackProviders = config.fallbackProviders ?? [];
    this.templates = config.templates;

    for (const [name, entry] of Object.entries(config.providers)) {
      this.providers.set(name, this.materializeProvider(entry, fetcher));
    }
  }

  async generate<T>(request: GenerationRequest<T>): Promise<GenerateResult<T>> {
    const targets = this.resolveGenerationTargets(request);
    const retry = this.resolveRetryOptions(request.retry ?? this.config.retry);

    return runWithFallback(
      targets.map(({ providerName, model }) => async () =>
        this.generateWithRetry(providerName, request, model, retry)),
    );
  }

  async generateMany<T>(request: GenerateManyRequest<T>): Promise<Array<GenerateResult<T>>> {
    return Promise.all(
      request.targets.map((target) => this.generateWithProvider(target.provider, request, target.model)),
    );
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const providerName = request.provider ?? this.defaultProvider ?? this.fallbackProviders[0];
    if (!providerName) {
      throw new ProviderConfigurationError('No provider configured for embeddings.');
    }

    const provider = ensureProvider(providerName, this.providers.get(providerName));
    if (!provider.embed) {
      throw new ProviderConfigurationError(`Provider "${providerName}" does not support embeddings.`);
    }

    const model = request.model ?? provider.defaultEmbeddingModel;
    if (!model) {
      throw new ProviderConfigurationError(`Provider "${providerName}" requires an embedding model.`);
    }

    const input = Array.isArray(request.input) ? request.input : [request.input];
    const result = await provider.embed({
      model,
      input,
      timeoutMs: request.timeoutMs,
      metadata: request.metadata,
      providerOptions: request.providerOptions,
      signal: request.signal,
    });

    return {
      provider: provider.name,
      model: result.model,
      embeddings: result.embeddings,
      usage: result.usage,
      raw: result.raw,
    };
  }

  registerProvider(name: string, provider: ProviderEntry): void {
    const fetcher = this.config.fetch ?? globalThis.fetch;
    if (!fetcher) {
      throw new ProviderConfigurationError('A global fetch implementation is required.');
    }

    this.providers.set(name, this.materializeProvider(provider, fetcher));
  }

  private async generateWithRetry<T>(
    providerName: string,
    request: Omit<GenerationRequest<T>, 'provider' | 'providerOrder' | 'providerTargets'>,
    requestedModel: string | undefined,
    retry: Required<RetryOptions>,
  ): Promise<GenerateResult<T>> {
    let attempt = 0;

    while (true) {
      try {
        return await this.generateWithProvider(providerName, request, requestedModel);
      } catch (error) {
        if (!(error instanceof ProviderExecutionError)) {
          throw error;
        }

        if (attempt >= retry.retries) {
          throw error;
        }

        attempt += 1;
        const waitMs = Math.max(0, retry.delayMs * retry.backoffMultiplier ** (attempt - 1));
        if (waitMs > 0) {
          await sleep(waitMs);
        }
      }
    }
  }

  private async generateWithProvider<T>(
    providerName: string,
    request: Omit<GenerationRequest<T>, 'provider' | 'providerOrder'>,
    requestedModel?: string,
  ): Promise<GenerateResult<T>> {
    const provider = ensureProvider(providerName, this.providers.get(providerName));
    const model = requestedModel ?? request.model ?? provider.defaultModel;
    if (!model) {
      throw new ProviderExecutionError(`Provider "${providerName}" requires a model.`, providerName);
    }

    try {
      const messages = await this.buildMessages(request, provider);
      const responseFormat = this.buildResponseFormat(request, provider);

      const providerResult = await provider.generate({
        model,
        messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        timeoutMs: request.timeoutMs,
        metadata: request.metadata,
        responseFormat,
        providerOptions: request.providerOptions,
        signal: request.signal,
      } satisfies ProviderGenerateOptions);

      const data = request.structured
        ? parseStructuredData({
            rawText: providerResult.text,
            rawData: providerResult.structuredData,
            schema: request.structured.schema,
          })
        : undefined;

      return {
        provider: provider.name,
        model: providerResult.model,
        text: providerResult.text,
        data,
        usage: providerResult.usage,
        finishReason: providerResult.finishReason,
        raw: providerResult.raw,
      };
    } catch (error) {
      if (error instanceof ProviderExecutionError) {
        throw error;
      }

      throw new ProviderExecutionError(
        error instanceof Error ? error.message : `Provider "${providerName}" failed.`,
        providerName,
        model,
        { cause: error },
      );
    }
  }

  private async buildMessages<T>(request: Omit<GenerationRequest<T>, 'provider' | 'providerOrder'>, provider: ProviderAdapter) {
    const existingMessages = [...(request.messages ?? [])];
    const template = await resolveTemplate({
      inlineTemplate: request.template,
      templateId: request.templateId,
      templateFile: request.templateFile,
      templates: this.templates,
    });

    let prompt = request.prompt ?? '';
    if (template) {
      prompt = renderTemplate(template, request.input);
    }

    const messages = [...existingMessages];

    if (request.system) {
      messages.unshift({ role: 'system' as const, content: request.system });
    }

    if (request.structured) {
      const nativeRequested = this.shouldUseNativeStructuredOutput(request, provider);
      if (!nativeRequested) {
        messages.unshift({
          role: 'system',
          content: buildStructuredInstructions(
            request.structured.name ?? 'structured_response',
            getStructuredJsonSchema(request.structured),
          ),
        });
      }
    }

    if (prompt) {
      messages.push({ role: 'user', content: prompt });
    }

    if (messages.length === 0) {
      throw new ProviderConfigurationError('A request must include prompt, messages, or a template.');
    }

    return messages;
  }

  private buildResponseFormat<T>(
    request: Omit<GenerationRequest<T>, 'provider' | 'providerOrder'>,
    provider: ProviderAdapter,
  ): ProviderResponseFormat | undefined {
    if (!request.structured) {
      return undefined;
    }

    if (!this.shouldUseNativeStructuredOutput(request, provider)) {
      return { type: 'text' };
    }

    if (provider.capabilities.structuredOutputs === 'json-object') {
      return { type: 'json_object' };
    }

    return {
      type: 'json_schema',
      name: request.structured.name ?? 'structured_response',
      description: request.structured.description,
      schema: getStructuredJsonSchema(request.structured),
      strict: true,
    };
  }

  private shouldUseNativeStructuredOutput<T>(
    request: Omit<GenerationRequest<T>, 'provider' | 'providerOrder'>,
    provider: ProviderAdapter,
  ): boolean {
    const mode = request.structured?.mode ?? 'auto';
    const capability = provider.capabilities.structuredOutputs ?? 'prompt-only';

    if (mode === 'prompted') {
      return false;
    }

    if (mode === 'native') {
      return capability !== 'prompt-only';
    }

    if (capability === 'json-schema') {
      return true;
    }

    return capability === 'json-object';
  }

  private resolveGenerationTargets<T>(request: GenerationRequest<T>): Array<{ providerName: string; model?: string }> {
    if (request.providerTargets?.length) {
      const unique = new Map<string, { providerName: string; model?: string }>();
      for (const target of [...request.providerTargets].sort((left, right) => left.priority - right.priority)) {
        const key = `${target.provider}::${target.model ?? ''}`;
        if (!unique.has(key)) {
          unique.set(key, {
            providerName: target.provider,
            model: target.model,
          });
        }
      }

      return [...unique.values()];
    }

    return this.resolveProviderOrder(request.provider, request.providerOrder).map((providerName) => ({
      providerName,
      model: request.model,
    }));
  }

  private resolveProviderOrder(primary?: string, providerOrder?: string[]): string[] {
    const order = [
      ...(primary ? [primary] : []),
      ...(providerOrder ?? []),
      ...(this.defaultProvider ? [this.defaultProvider] : []),
      ...this.fallbackProviders,
    ].filter(Boolean);

    const unique = [...new Set(order)];
    if (unique.length === 0) {
      throw new ProviderConfigurationError('No providers were configured for this request.');
    }

    return unique;
  }

  private resolveRetryOptions(input?: number | RetryOptions): Required<RetryOptions> {
    if (typeof input === 'number') {
      return {
        retries: Math.max(0, input),
        delayMs: 0,
        backoffMultiplier: 1,
      };
    }

    return {
      retries: Math.max(0, input?.retries ?? 0),
      delayMs: Math.max(0, input?.delayMs ?? 0),
      backoffMultiplier: Math.max(1, input?.backoffMultiplier ?? 1),
    };
  }

  private materializeProvider(entry: ProviderEntry, fetcher: typeof fetch): ProviderAdapter {
    return typeof entry === 'function' ? entry({ fetch: fetcher }) : entry;
  }
}

export function createXoin(config: XoinConfig): Xoin {
  return new Xoin(config);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
