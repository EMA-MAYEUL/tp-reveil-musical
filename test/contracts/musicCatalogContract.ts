import { describe, expect, it } from 'vitest';
import type { MusicCatalog } from '../../src/application/ports.js';
import { ProviderUnavailableError } from '../../src/domain/errors.js';

export type CatalogScenario = 'found' | 'notFound' | 'serverError' | 'networkError';

/**
 * Contract every MusicCatalog must honour, whatever the provider behind it.
 * `build` returns a catalog whose fake backend behaves according to the scenario.
 */
export function musicCatalogContract(label: string, build: (scenario: CatalogScenario) => MusicCatalog) {
  describe(`MusicCatalog contract: ${label}`, () => {
    it('has a name', () => {
      expect(build('found').name).not.toBe('');
    });

    it('returns a domain Track with only a title and an artist', async () => {
      const track = await build('found').findTrack('Here Comes the Sun');

      expect(track).toBeDefined();
      expect(Object.keys(track!).sort()).toEqual(['artist', 'title']);
      expect(track!.title).not.toBe('');
      expect(track!.artist).not.toBe('');
    });

    it('returns undefined when nothing matches', async () => {
      await expect(build('notFound').findTrack('zzzz')).resolves.toBeUndefined();
    });

    it('throws ProviderUnavailableError on a server error', async () => {
      await expect(build('serverError').findTrack('x')).rejects.toBeInstanceOf(ProviderUnavailableError);
    });

    it('throws ProviderUnavailableError on a network error', async () => {
      await expect(build('networkError').findTrack('x')).rejects.toBeInstanceOf(ProviderUnavailableError);
    });
  });
}
