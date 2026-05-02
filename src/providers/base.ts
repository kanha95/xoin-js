import {
  ProviderAdapter,
  ProviderCapabilities,
  ProviderEmbeddingOptions,
  ProviderEmbeddingResult,
  ProviderGenerateOptions,
  ProviderGenerateResult,
} from '../types';
import { EmbeddingError } from '../core/errors';

export abstract class BaseProvider implements ProviderAdapter {
  abstract readonly name: string;
  abstract readonly capabilities: ProviderCapabilities;
  readonly defaultModel?: string;
  readonly defaultEmbeddingModel?: string;

  abstract generate(options: ProviderGenerateOptions): Promise<ProviderGenerateResult>;

  async embed(_options: ProviderEmbeddingOptions): Promise<ProviderEmbeddingResult> {
    throw new EmbeddingError(`${this.name} does not support embeddings.`);
  }
}
