import { describe, expect, it } from 'vitest';
import { LOCAL_FALLBACK_SOURCE, TrackResolver } from '../../src/application/TrackResolver.js';
import type { MusicCatalog } from '../../src/application/ports.js';
import { FALLBACK_TRACK, fakeFallbackTrackProvider, fakeLogger, fakeMusicCatalog } from '../fakes.js';

function resolverWith(musicCatalogs: MusicCatalog[], logger = fakeLogger()) {
  return new TrackResolver({ musicCatalogs, fallbackTrackProvider: fakeFallbackTrackProvider(), logger });
}

describe('TrackResolver', () => {
  it('uses the first catalog when it finds the track', async () => {
    const primary = fakeMusicCatalog('primary');
    const secondary = fakeMusicCatalog('secondary');

    const result = await resolverWith([primary, secondary]).resolve('Here Comes the Sun', 'SOLEIL');

    expect(result).toEqual({
      track: { title: 'Here Comes the Sun', artist: 'primary artist' },
      source: 'primary',
      degraded: false,
    });
    expect(secondary.queries).toEqual([]);
  });

  it('falls back to the next catalog when the first one fails', async () => {
    const logger = fakeLogger();
    const result = await resolverWith([fakeMusicCatalog('primary', 'fail'), fakeMusicCatalog('secondary')], logger)
      .resolve('Song', 'PLUIE');

    expect(result.source).toBe('secondary');
    expect(result.degraded).toBe(true);
    expect(logger.warnings).toEqual(['primary failed: primary is down']);
  });

  it('falls back to the next catalog when the first one finds nothing', async () => {
    const result = await resolverWith([fakeMusicCatalog('primary', 'empty'), fakeMusicCatalog('secondary')])
      .resolve('Song', 'PLUIE');

    expect(result.source).toBe('secondary');
  });

  it('never stays silent: uses the local list when every catalog fails', async () => {
    const result = await resolverWith([fakeMusicCatalog('primary', 'fail'), fakeMusicCatalog('secondary', 'empty')])
      .resolve('Song', 'NEIGE');

    expect(result).toEqual({ track: FALLBACK_TRACK, source: LOCAL_FALLBACK_SOURCE, degraded: true });
  });

  it('uses the local list when no catalog is configured', async () => {
    const result = await resolverWith([]).resolve('Song', 'NUAGEUX');

    expect(result.track).toEqual(FALLBACK_TRACK);
  });
});
