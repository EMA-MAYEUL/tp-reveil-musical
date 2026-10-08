import { ProviderUnavailableError } from '../../domain/errors.js';
import { errorMessage } from '../../application/errorMessage.js';

export type HttpFetch = typeof fetch;

/** GET a JSON document; any network error, timeout or non-2xx status becomes a ProviderUnavailableError. */
export async function fetchJson(
  httpFetch: HttpFetch,
  provider: string,
  url: string,
  options: { timeoutMs: number; headers?: Record<string, string> },
): Promise<unknown> {
  let response: Response;
  try {
    response = await httpFetch(url, {
      headers: { Accept: 'application/json', ...options.headers },
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (error) {
    throw new ProviderUnavailableError(provider, errorMessage(error));
  }
  if (!response.ok) {
    throw new ProviderUnavailableError(provider, `HTTP ${response.status}`);
  }
  try {
    return await response.json();
  } catch {
    throw new ProviderUnavailableError(provider, 'invalid JSON');
  }
}
