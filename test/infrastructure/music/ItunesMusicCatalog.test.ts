import { describe, expect, it } from 'vitest';
import { ItunesMusicCatalog } from '../../../src/infrastructure/music/itunes/ItunesMusicCatalog.js';
import { ProviderUnavailableError } from '../../../src/domain/errors.js';
import { type CatalogScenario, musicCatalogContract } from '../../contracts/musicCatalogContract.js';
import { fakeFetch } from '../../fakeFetch.js';

const FOUND = {
  resultCount: 2,
  results: [
    { wrapperType: 'collection', collectionName: 'Abbey Road' },
    { trackName: 'Here Comes the Sun', artistName: 'The Beatles', trackViewUrl: 'https://music.apple.com/x' },
  ],
};

const REPLIES = {
  found: { body: FOUND },
  notFound: { body: { resultCount: 0, results: [] } },
  serverError: { status: 503 },
  networkError: new TypeError('fetch failed'),
} satisfies Record<CatalogScenario, unknown>;

function catalog(httpFetch = fakeFetch(REPLIES.found)) {
  return new ItunesMusicCatalog({ httpFetch, itunesConfig: { baseUrl: 'https://itunes.test', timeoutMs: 1000 } });
}

musicCatalogContract('iTunes', (scenario) => catalog(fakeFetch(REPLIES[scenario])));

describe('ItunesMusicCatalog', () => {
  it('queries the search endpoint with an encoded term', async () => {
    const httpFetch = fakeFetch(REPLIES.found);

    await catalog(httpFetch).findTrack('Here Comes the Sun');

    expect(httpFetch.requests[0]!.url).toBe('https://itunes.test/search?term=Here%20Comes%20the%20Sun&media=music&limit=5');
  });

  it('skips results that are not tracks and does not leak trackViewUrl', async () => {
    const track = await catalog().findTrack('Here Comes the Sun');

    expect(track).toEqual({ title: 'Here Comes the Sun', artist: 'The Beatles' });
  });

  it('throws ProviderUnavailableError on an invalid JSON body', async () => {
    await expect(catalog(fakeFetch({ rawBody: '<html>' })).findTrack('x')).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});
