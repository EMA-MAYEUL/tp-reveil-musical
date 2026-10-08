import type { Clock, MusicCatalog } from '../../application/ports.js';
import type { Track } from '../../domain/wakeUp.js';

interface Deps {
  inner: MusicCatalog;
  clock: Clock;
  musicCacheTtlMs: number;
}

/**
 * Decorator that caches successful lookups so that users sharing the same track
 * do not burn the provider's rate limit (iTunes: ~20 requests/minute). Failures are not cached.
 */
export class CachedMusicCatalog implements MusicCatalog {
  readonly name: string;
  private readonly inner: MusicCatalog;
  private readonly clock: Clock;
  private readonly ttlMs: number;
  private readonly entries = new Map<string, { track: Track | undefined; expiresAt: number }>();

  constructor({ inner, clock, musicCacheTtlMs }: Deps) {
    this.inner = inner;
    this.name = inner.name;
    this.clock = clock;
    this.ttlMs = musicCacheTtlMs;
  }

  async findTrack(query: string): Promise<Track | undefined> {
    const key = query.trim().toLowerCase();
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > this.clock.now()) {
      return cached.track;
    }
    const track = await this.inner.findTrack(query);
    this.entries.set(key, { track, expiresAt: this.clock.now() + this.ttlMs });
    return track;
  }
}
