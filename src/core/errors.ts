export class XoinError extends Error {
  constructor(message: string, public readonly code: string, options?: { cause?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class TemplateError extends XoinError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'TEMPLATE_ERROR', options);
  }
}

export class StructuredOutputError extends XoinError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'STRUCTURED_OUTPUT_ERROR', options);
  }
}

export class ProviderExecutionError extends XoinError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly model?: string,
    options?: { cause?: unknown },
  ) {
    super(message, 'PROVIDER_EXECUTION_ERROR', options);
  }
}

export class ProviderConfigurationError extends XoinError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'PROVIDER_CONFIGURATION_ERROR', options);
  }
}

export class EmbeddingError extends XoinError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'EMBEDDING_ERROR', options);
  }
}

export class AggregateProviderError extends XoinError {
  constructor(public readonly errors: ProviderExecutionError[]) {
    super(
      `All providers failed: ${errors.map((error) => `${error.provider}${error.model ? `/${error.model}` : ''}`).join(', ')}`,
      'ALL_PROVIDERS_FAILED',
    );
  }
}
