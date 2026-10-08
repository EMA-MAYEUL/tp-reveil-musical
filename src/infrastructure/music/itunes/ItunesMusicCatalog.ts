import type { MusicCatalog } from '../../../application/ports.js';
import type { Track } from '../../../domain/wakeUp.js';
import { fetchJson, type HttpFetch } from '../../http/fetchJson.js';
import type { ItunesSearchResponse } from './itunes.dto.js';

export interface ItunesConfig {
  baseUrl: string;
  timeoutMs: number;
}

interface Deps {
  httpFetch: HttpFetch;
  itunesConfig: ItunesConfig;
}

export class ItunesMusicCatalog implements MusicCatalog {
  readonly name = 'itunes';
  private readonly httpFetch: HttpFetch;
  private readonly config: ItunesConfig;

  constructor({ httpFetch, itunesConfig }: Deps) {
    this.httpFetch = httpFetch;
    this.config = itunesConfig;
  }

  async findTrack(query: string): Promise<Track | undefined> {
    const url = `${this.config.baseUrl}/search?term=${encodeURIComponent(query)}&media=music&limit=5`;
    const body = (await fetchJson(this.httpFetch, this.name, url, { timeoutMs: this.config.timeoutMs })) as ItunesSearchResponse;

    const match = body.results?.find((result) => result.trackName && result.artistName);
    // Mapping to the domain model: trackViewUrl stays here on purpose.
    return match ? { title: match.trackName!, artist: match.artistName! } : undefined;
  }
}
