import type { Track, Weather } from '../domain/wakeUp.js';
import { errorMessage } from './errorMessage.js';
import type { FallbackTrackProvider, Logger, MusicCatalog } from './ports.js';

export const LOCAL_FALLBACK_SOURCE = 'local-fallback';

export interface ResolvedTrack {
  track: Track;
  source: string;
  degraded: boolean;
}

interface Deps {
  musicCatalogs: MusicCatalog[];
  fallbackTrackProvider: FallbackTrackProvider;
  logger: Logger;
}

/**
 * Tries each configured catalog in order, then the local fallback list.
 * Business rule: a wake-up is never silent, so resolve() always returns a track.
 */
export class TrackResolver {
  private readonly catalogs: MusicCatalog[];
  private readonly fallback: FallbackTrackProvider;
  private readonly logger: Logger;

  constructor({ musicCatalogs, fallbackTrackProvider, logger }: Deps) {
    this.catalogs = musicCatalogs;
    this.fallback = fallbackTrackProvider;
    this.logger = logger;
  }

  async resolve(query: string, weather: Weather): Promise<ResolvedTrack> {
    for (const [index, catalog] of this.catalogs.entries()) {
      try {
        const track = await catalog.findTrack(query);
        if (track) {
          return { track, source: catalog.name, degraded: index > 0 };
        }
        this.logger.warn(`${catalog.name}: no result for "${query}"`);
      } catch (error) {
        this.logger.warn(`${catalog.name} failed: ${errorMessage(error)}`);
      }
    }
    return { track: this.fallback.pick(weather), source: LOCAL_FALLBACK_SOURCE, degraded: true };
  }
}
