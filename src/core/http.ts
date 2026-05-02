import { ProviderExecutionError } from './errors';

export async function fetchJson<T>(
  provider: string,
  input: string,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<T> {
  const response = await fetcher(input, init);
  const text = await response.text();

  if (!response.ok) {
    throw new ProviderExecutionError(
      `${provider} request failed with status ${response.status}: ${truncate(text)}`,
      provider,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new ProviderExecutionError(
      `${provider} returned invalid JSON: ${truncate(text)}`,
      provider,
      undefined,
      { cause: error },
    );
  }
}

function truncate(value: string, max = 400): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}
