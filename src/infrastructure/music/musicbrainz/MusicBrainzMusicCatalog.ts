import type { MusicCatalog } from '../../../application/ports.js';
import type { Track } from '../../../domain/wakeUp.js';
import { fetchJson, type HttpFetch } from '../../http/fetchJson.js';
import type { MusicBrainzRecordingDto, MusicBrainzSearchResponse } from './musicbrainz.dto.js';

export interface MusicBrainzConfig {
  baseUrl: string;
  timeoutMs: number;
  /** Required by MusicBrainz: "<app name>/<version> ( <contact> )", otherwise requests are rejected. */
  userAgent: string;
}

interface Deps {
  httpFetch: HttpFetch;
  musicBrainzConfig: MusicBrainzConfig;
}

export class MusicBrainzMusicCatalog implements MusicCatalog {
  readonly name = 'musicbrainz';
  private readonly httpFetch: HttpFetch;
  private readonly config: MusicBrainzConfig;

  constructor({ httpFetch, musicBrainzConfig }: Deps) {
    this.httpFetch = httpFetch;
    this.config = musicBrainzConfig;
  }

  async findTrack(query: string): Promise<Track | undefined> {
    const url = `${this.config.baseUrl}/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
    const body = (await fetchJson(this.httpFetch, this.name, url, {
      timeoutMs: this.config.timeoutMs,
      headers: { 'User-Agent': this.config.userAgent },
    })) as MusicBrainzSearchResponse;

    const match = body.recordings?.find((recording) => recording.title && recording['artist-credit']?.length);
    return match ? { title: match.title!, artist: artistName(match) } : undefined;
  }
}

function artistName(recording: MusicBrainzRecordingDto): string {
  return (recording['artist-credit'] ?? []).map((credit) => credit.name + (credit.joinphrase ?? '')).join('');
}
