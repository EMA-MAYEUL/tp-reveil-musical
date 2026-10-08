import { describe, expect, it } from 'vitest';
import { MusicBrainzMusicCatalog } from '../../../src/infrastructure/music/musicbrainz/MusicBrainzMusicCatalog.js';
import { type CatalogScenario, musicCatalogContract } from '../../contracts/musicCatalogContract.js';
import { fakeFetch } from '../../fakeFetch.js';

const FOUND = {
  recordings: [
    { title: 'Untitled' },
    {
      title: 'Under Pressure',
      'artist-credit': [{ name: 'Queen', joinphrase: ' & ' }, { name: 'David Bowie' }],
    },
  ],
};

const REPLIES = {
  found: { body: FOUND },
  notFound: { body: { recordings: [] } },
  serverError: { status: 500 },
  networkError: new TypeError('fetch failed'),
} satisfies Record<CatalogScenario, unknown>;

const CONFIG = { baseUrl: 'https://mb.test', timeoutMs: 1000, userAgent: 'tp-reveil-musical/1.0 ( test@example.com )' };

function catalog(httpFetch = fakeFetch(REPLIES.found)) {
  return new MusicBrainzMusicCatalog({ httpFetch, musicBrainzConfig: CONFIG });
}

musicCatalogContract('MusicBrainz', (scenario) => catalog(fakeFetch(REPLIES[scenario])));

describe('MusicBrainzMusicCatalog', () => {
  it('sends the identifying User-Agent required by MusicBrainz', async () => {
    const httpFetch = fakeFetch(REPLIES.found);

    await catalog(httpFetch).findTrack('Under Pressure');

    expect(httpFetch.requests[0]!.url).toBe('https://mb.test/ws/2/recording?query=Under%20Pressure&fmt=json&limit=5');
    expect(httpFetch.requests[0]!.headers['User-Agent']).toBe(CONFIG.userAgent);
  });

  it('joins the artist credits and skips recordings without artist', async () => {
    const track = await catalog().findTrack('Under Pressure');

    expect(track).toEqual({ title: 'Under Pressure', artist: 'Queen & David Bowie' });
  });
});
