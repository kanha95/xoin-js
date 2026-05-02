import { AggregateProviderError, ProviderExecutionError } from './errors';

export async function runWithFallback<T>(tasks: Array<() => Promise<T>>): Promise<T> {
  const errors: ProviderExecutionError[] = [];

  for (const task of tasks) {
    try {
      return await task();
    } catch (error) {
      if (error instanceof ProviderExecutionError) {
        errors.push(error);
        continue;
      }

      throw error;
    }
  }

  throw new AggregateProviderError(errors);
}
