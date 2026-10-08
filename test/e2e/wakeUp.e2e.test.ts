import { asValue, type Resolver } from 'awilix';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { buildContainer } from '../../src/container.js';
import { buildApp } from '../../src/presentation/http/buildApp.js';
import { fakeFetch } from '../fakeFetch.js';
import { fakeLogger } from '../fakes.js';

const ITUNES_SUN = { resultCount: 1, results: [{ trackName: 'Here Comes the Sun', artistName: 'The Beatles', trackViewUrl: 'x' }] };
const MB_SUN = { recordings: [{ title: 'Here Comes the Sun', 'artist-credit': [{ name: 'The Beatles' }] }] };

/** Real container and real adapters; only the network, the console and the logger are replaced. */
function startApp(
  env: Record<string, string> = {},
  network = fakeFetch((url) => ({ body: url.includes('itunes') ? ITUNES_SUN : MB_SUN })),
  overrides: Record<string, Resolver<unknown>> = {},
) {
  const output: string[] = [];
  const container = buildContainer(loadConfig(env));
  container.register({
    httpFetch: asValue(network),
    outputSink: asValue({ write: (line: string) => output.push(line) }),
    logger: asValue(fakeLogger()),
    ...overrides,
  });
  return { app: buildApp(container.cradle), output, network };
}

async function postWakeUp(app: ReturnType<typeof startApp>['app'], payload: object) {
  return app.inject({ method: 'POST', url: '/wake-up', payload });
}

describe('POST /wake-up', () => {
  it('wakes the user up with the track for the weather on the preferred channel', async () => {
    const { app, output, network } = startApp();

    const response = await postWakeUp(app, { userId: 'alice', dayOfWeek: 'LUNDI', weather: 'SOLEIL' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      userId: 'alice',
      track: { title: 'Here Comes the Sun', artist: 'The Beatles' },
      musicSource: 'itunes',
      channel: 'SMS',
      degraded: { music: false, notification: false },
    });
    expect(network.requests[0]!.url).toContain('https://itunes.apple.com/search?term=Here%20Comes%20the%20Sun');
    expect(output).toEqual(['[SMS] +33600000001: Bon lundi ! Ton morceau du jour : Here Comes the Sun - The Beatles']);
  });

  it('does not leak provider-specific fields such as trackViewUrl', async () => {
    const { app } = startApp();

    const response = await postWakeUp(app, { userId: 'alice', dayOfWeek: 'LUNDI', weather: 'SOLEIL' });

    expect(response.body).not.toContain('trackViewUrl');
  });

  it('switches music provider through configuration only', async () => {
    const { app, network } = startApp({ MUSIC_PROVIDERS: 'musicbrainz' });

    const response = await postWakeUp(app, { userId: 'alice', dayOfWeek: 'LUNDI', weather: 'SOLEIL' });

    expect(response.json().musicSource).toBe('musicbrainz');
    expect(network.requests[0]!.url).toContain('https://musicbrainz.org/ws/2/recording');
  });

  it('still wakes the user up when the network and the preferred channel are down', async () => {
    const { app, output } = startApp({ SIMULATED_OUTAGES: 'SMS' }, fakeFetch(new TypeError('fetch failed')));

    const response = await postWakeUp(app, { userId: 'alice', dayOfWeek: 'MARDI', weather: 'PLUIE' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      track: { title: 'Singin’ in the Rain', artist: 'Gene Kelly' },
      musicSource: 'local-fallback',
      channel: 'EMAIL',
      degraded: { music: true, notification: true },
    });
    expect(output[0]).toMatch(/^\[EMAIL\] to=alice@example.com/);
  });

  it('answers 404 for an unknown user', async () => {
    const { app } = startApp();

    const response = await postWakeUp(app, { userId: 'nobody', dayOfWeek: 'LUNDI', weather: 'SOLEIL' });

    expect(response.statusCode).toBe(404);
  });

  it('answers 500 without details when the internal user service fails', async () => {
    const brokenUsers = { findById: async () => Promise.reject(new Error('db down')) };
    const { app } = startApp({}, undefined, { userProfileRepository: asValue(brokenUsers) });

    const response = await postWakeUp(app, { userId: 'alice', dayOfWeek: 'LUNDI', weather: 'SOLEIL' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Internal error' });
  });

  it.each([
    { userId: 'alice', dayOfWeek: 'LUNDI', weather: 'GRELE' },
    { userId: 'alice', dayOfWeek: 'MONDAY', weather: 'SOLEIL' },
    { userId: 'alice', weather: 'SOLEIL' },
  ])('answers 400 for an invalid request %o', async (payload) => {
    const { app } = startApp();

    const response = await postWakeUp(app, payload);

    expect(response.statusCode).toBe(400);
  });
});

describe('composition root', () => {
  it('refuses an unknown music provider at startup', () => {
    expect(() => buildContainer(loadConfig({ MUSIC_PROVIDERS: 'spotify' }))).toThrow(/Unknown music provider/);
  });
});
