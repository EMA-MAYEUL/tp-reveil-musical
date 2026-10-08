import { describe, expect, it } from 'vitest';
import { CachedMusicCatalog } from '../../../src/infrastructure/music/CachedMusicCatalog.js';
import { type CatalogScenario, musicCatalogContract } from '../../contracts/musicCatalogContract.js';
import { fakeMusicCatalog } from '../../fakes.js';
import { ProviderUnavailableError } from '../../../src/domain/errors.js';
import type { MusicCatalog } from '../../../src/application/ports.js';

function fakeClock(start = 0) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

function cached(inner: MusicCatalog, clock = fakeClock()) {
  return new CachedMusicCatalog({ inner, clock, musicCacheTtlMs: 60_000 });
}

const SCENARIOS: Record<CatalogScenario, MusicCatalog> = {
  found: fakeMusicCatalog('inner'),
  notFound: fakeMusicCatalog('inner', 'empty'),
  serverError: { name: 'inner', findTrack: async () => Promise.reject(new ProviderUnavailableError('inner', 'HTTP 500')) },
  networkError: { name: 'inner', findTrack: async () => Promise.reject(new ProviderUnavailableError('inner', 'offline')) },
};

musicCatalogContract('Cached decorator', (scenario) => cached(SCENARIOS[scenario]));

describe('CachedMusicCatalog', () => {
  it('keeps the name of the decorated catalog', () => {
    expect(cached(fakeMusicCatalog('itunes')).name).toBe('itunes');
  });

  it('serves repeated queries from the cache until the TTL expires', async () => {
    const inner = fakeMusicCatalog('inner');
    const clock = fakeClock();
    const catalog = cached(inner, clock);

    await catalog.findTrack('Song');
    await catalog.findTrack(' song ');
    expect(inner.queries).toEqual(['Song']);

    clock.advance(60_001);
    await catalog.findTrack('Song');
    expect(inner.queries).toEqual(['Song', 'Song']);
  });

  it('does not cache failures', async () => {
    const inner = fakeMusicCatalog('inner', 'fail');
    const catalog = cached(inner);

    await expect(catalog.findTrack('Song')).rejects.toThrow();
    await expect(catalog.findTrack('Song')).rejects.toThrow();
    expect(inner.queries).toHaveLength(2);
  });
});
