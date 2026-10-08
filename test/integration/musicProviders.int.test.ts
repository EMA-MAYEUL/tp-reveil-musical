// Real network calls: run with `npm run test:integration` (excluded from `npm test`).
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { ItunesMusicCatalog } from '../../src/infrastructure/music/itunes/ItunesMusicCatalog.js';
import { MusicBrainzMusicCatalog } from '../../src/infrastructure/music/musicbrainz/MusicBrainzMusicCatalog.js';

const config = loadConfig(process.env);

describe('real music providers', () => {
  it('iTunes finds a well-known track', async () => {
    const catalog = new ItunesMusicCatalog({ httpFetch: fetch, itunesConfig: { ...config.itunes, timeoutMs: 10_000 } });

    const track = await catalog.findTrack('Here Comes the Sun Beatles');

    expect(track?.title).toMatch(/Here Comes the Sun/i);
  });

  it('MusicBrainz finds a well-known track with our User-Agent', async () => {
    const catalog = new MusicBrainzMusicCatalog({
      httpFetch: fetch,
      musicBrainzConfig: { ...config.musicBrainz, timeoutMs: 10_000 },
    });

    const track = await catalog.findTrack('Here Comes the Sun');

    expect(track?.title).toMatch(/Here Comes the Sun/i);
  });
});
