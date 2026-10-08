import type { HttpFetch } from '../src/infrastructure/http/fetchJson.js';

export interface RecordedRequest {
  url: string;
  headers: Record<string, string>;
}

type Reply = { status?: number; body?: unknown; rawBody?: string } | Error;

/** fetch replacement: answers every request with the given reply and records what was asked. */
export function fakeFetch(reply: Reply | ((url: string) => Reply)): HttpFetch & { requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const fn = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const answer = typeof reply === 'function' ? reply(url) : reply;
    if (answer instanceof Error) throw answer;
    const text = answer.rawBody ?? JSON.stringify(answer.body ?? {});
    return new Response(text, { status: answer.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  };
  return Object.assign(fn as HttpFetch, { requests });
}
